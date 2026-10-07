import { ProductPhoto } from "./RealPhoneArt";
import type { Product } from "../lib/data";

export function BrandBar({ products, onBrand }: { products: Product[]; onBrand: (brand: string) => void }) {
  const items = products.filter((product) => product.type === "PRODUCT");
  const brands = [...new Set(items.map((product) => product.brand))]
    .map((brand) => {
      const models = items.filter((product) => product.brand === brand);
      const cover = models.find((product) => product.featured && product.image) ?? models.find((product) => product.image) ?? models[0];
      return { brand, count: models.length, image: cover.image };
    })
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand));

  if (brands.length === 0) return null;

  return (
    <div id="marcas" className="flex flex-wrap items-center gap-x-8 gap-y-5 border-t border-line pt-8">
      <h3 className="display max-w-[11rem] text-xl font-bold leading-tight">Tu celular, nuestra pasión</h3>
      <ul className="flex flex-wrap gap-2.5">
        {brands.map((item) => (
          <li key={item.brand}>
            <button
              type="button"
              onClick={() => onBrand(item.brand)}
              className="group flex h-14 items-center gap-2.5 rounded-full border border-ink/15 pl-2.5 pr-5 hover:border-ink"
            >
              <ProductPhoto src={item.image} alt="" className="h-9 w-9 shrink-0 transition duration-300 group-hover:scale-110" />
              <span className="display text-base font-bold text-ink/70 group-hover:text-ink">{item.brand}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
