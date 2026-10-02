import { publicUrl } from "../lib/publicUrl";

export function Logo({ subtitle }: { subtitle?: string }) {
  return (
    <span className="inline-flex items-center">
      <img src={publicUrl("/brand/wicel-logo.png")} alt="wicel" width={99} height={37} className="h-10 w-auto object-contain object-left" />
      {subtitle ? <span className="sr-only">{subtitle}</span> : null}
    </span>
  );
}
