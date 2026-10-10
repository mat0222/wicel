"""Exporta el catálogo público y sus fotos sin datos de clientes ni credenciales."""

from __future__ import annotations

import json
import re
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
API_BASE = "http://127.0.0.1:8080"
ASSET_DIR = ROOT / "public" / "catalogo" / "productos"
SQL_PATH = ROOT / "database" / "catalogo-productos.sql"


def sql(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    escaped = str(value).replace("\\", "\\\\").replace("'", "''").replace("\n", "\\n")
    return f"'{escaped}'"


def slug(text: str) -> str:
    plain = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", plain.lower()).strip("-") or "marca"


def fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url) as response:
        return json.load(response)


def download(url: str, target: Path) -> None:
    with urllib.request.urlopen(url) as response:
        target.write_bytes(response.read())


def main() -> None:
    catalog = fetch_json(f"{API_BASE}/api/catalogo")
    products = [product for product in catalog["products"] if product["type"] == "PRODUCT"]
    if not products:
        raise RuntimeError("El catálogo público está vacío; no se generó el respaldo.")

    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    for old in ASSET_DIR.glob("p*-v*.*"):
        old.unlink()

    lines = [
        "-- Catálogo público de Wicel.",
        "-- Generado desde /api/catalogo. No contiene usuarios, pedidos, sesiones ni credenciales.",
        "-- Importar después de database/wicel.sql.",
        "SET NAMES utf8mb4;",
        "START TRANSACTION;",
        "",
    ]

    brands = sorted({product["brand"] for product in products})
    for brand in brands:
        lines.append(
            "INSERT INTO brands (name, slug, is_active) "
            f"VALUES ({sql(brand)}, {sql(slug(brand))}, 1) "
            "ON DUPLICATE KEY UPDATE is_active = 1;"
        )

    colors: dict[str, str | None] = {}
    for product in products:
        for color in product["colors"]:
            colors[color["name"]] = color.get("hex")
    for name, hex_code in sorted(colors.items()):
        lines.append(
            "INSERT INTO colors (name, hex_code, is_active) "
            f"VALUES ({sql(name)}, {sql(hex_code)}, 1) "
            "ON DUPLICATE KEY UPDATE hex_code = VALUES(hex_code), is_active = 1;"
        )

    lines.extend(
        [
            "",
            "-- El respaldo representa exactamente los productos activos del catálogo.",
            "UPDATE products SET is_active = 0 WHERE product_type <> 'COMBO';",
            "",
        ]
    )

    for product in products:
        product_id = int(product["id"])
        product_type = "PHONE" if product["phone"] else "OTHER"
        short_description = "ASK_PRICE" if product.get("askPrice") else None
        lines.append(
            "INSERT INTO products "
            "(id, brand_id, category_id, name, slug, description, short_description, "
            "product_type, warranty_months, is_featured, is_active) VALUES "
            f"({product_id}, (SELECT id FROM brands WHERE name = {sql(product['brand'])}), "
            f"{int(product['categoryId'])}, {sql(product['name'])}, {sql(product['slug'])}, "
            f"{sql(product.get('description', ''))}, {sql(short_description)}, {sql(product_type)}, "
            f"0, {sql(bool(product.get('featured')))}, 1) "
            "ON DUPLICATE KEY UPDATE "
            "brand_id = VALUES(brand_id), category_id = VALUES(category_id), name = VALUES(name), "
            "slug = VALUES(slug), description = VALUES(description), "
            "short_description = VALUES(short_description), product_type = VALUES(product_type), "
            "is_featured = VALUES(is_featured), is_active = 1;"
        )
        lines.append(f"UPDATE product_variants SET is_active = 0 WHERE product_id = {product_id};")
        lines.append(f"DELETE FROM product_images WHERE product_id = {product_id};")

        storage = product.get("storage") or ""
        storage_id = (
            f"(SELECT id FROM storage_options WHERE label = {sql(storage)})" if storage else "NULL"
        )
        ram_match = re.search(r"\d+", product.get("ram") or "")
        ram = int(ram_match.group()) if ram_match else None
        condition = "USED" if product.get("condition") == "Usados" else "NEW"

        for color in product["colors"]:
            variant_id = int(color["variantId"])
            image_url = color.get("image")
            static_url = None
            if image_url:
                suffix = Path(urllib.parse.urlparse(image_url).path).suffix.lower() or ".webp"
                filename = f"p{product_id}-v{variant_id}{suffix}"
                download(urllib.parse.urljoin(API_BASE, image_url), ASSET_DIR / filename)
                static_url = f"/catalogo/productos/{filename}"

            lines.append(
                "INSERT INTO product_variants "
                "(id, product_id, sku, color_id, storage_id, ram_gb, condition_type, "
                "sale_price, compare_at_price, weight_grams, is_active) VALUES "
                f"({variant_id}, {product_id}, {sql(f'WI-CATALOG-{variant_id}')}, "
                f"(SELECT id FROM colors WHERE name = {sql(color['name'])}), {storage_id}, "
                f"{sql(ram)}, {sql(condition)}, {sql(product.get('price', 0))}, "
                f"{sql(product.get('oldPrice'))}, {sql(1 if color.get('onOrder') else None)}, 1) "
                "ON DUPLICATE KEY UPDATE "
                "product_id = VALUES(product_id), color_id = VALUES(color_id), "
                "storage_id = VALUES(storage_id), ram_gb = VALUES(ram_gb), "
                "condition_type = VALUES(condition_type), sale_price = VALUES(sale_price), "
                "compare_at_price = VALUES(compare_at_price), weight_grams = VALUES(weight_grams), "
                "is_active = 1;"
            )
            lines.append(
                "INSERT INTO inventory_stock (warehouse_id, variant_id, quantity, minimum_stock) VALUES "
                f"((SELECT id FROM warehouses WHERE is_active = 1 ORDER BY id LIMIT 1), "
                f"{variant_id}, {int(color.get('stock', 0))}, 5) "
                "ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), minimum_stock = VALUES(minimum_stock);"
            )
            if static_url:
                lines.append(
                    "INSERT INTO product_images "
                    "(product_id, variant_id, image_url, alt_text, position, is_primary) VALUES "
                    f"({product_id}, {variant_id}, {sql(static_url)}, "
                    f"{sql(product['name'] + ' ' + color['name'])}, 0, 1);"
                )
        lines.append("")

    lines.extend(["COMMIT;", ""])
    SQL_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"Exportados {len(products)} productos y {sum(len(p['colors']) for p in products)} fotos.")


if __name__ == "__main__":
    main()
