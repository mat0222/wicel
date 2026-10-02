import { imageUrl } from "../lib/data";

export function ProductPhoto({ src, alt = "", className = "h-28 w-full" }: { src: string | null; alt?: string; className?: string }) {
  const url = imageUrl(src);
  return (
    <div className={`flex items-center justify-center ${className}`}>
      {url ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="grid h-full w-full place-items-center rounded-xl bg-[#8a8a8a1f] text-[11px] text-[#8a8a8a]">Sin foto</span>
      )}
    </div>
  );
}
