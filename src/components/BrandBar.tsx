import { ProductPhoto } from "./RealPhoneArt";
import type { Product } from "../data";

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
    <section id="marcas" aria-labelledby="marcas-titulo" className="mx-auto max-w-[1240px] px-4 pt-14">
      <h2 id="marcas-titulo" className="display text-2xl font-bold sm:text-3xl">Elegí por marca</h2>
      <ul className="-mx-4 mt-6 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
        {brands.map((item) => (
          <li key={item.brand} className="w-[42%] shrink-0 snap-start sm:w-auto">
            <button type="button" onClick={() => onBrand(item.brand)} className="group block w-full text-left">
              <span className="block overflow-hidden rounded-2xl border border-line bg-white p-4 transition group-hover:border-[#c9c9c4]">
                <ProductPhoto src={item.image} alt="" className="h-32 w-full transition duration-300 group-hover:scale-[1.04] sm:h-40" />
              </span>
              <span className="mt-3 block text-base font-semibold">{item.brand}</span>
              <span className="block text-sm text-muted">{item.count} {item.count === 1 ? "modelo" : "modelos"}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
