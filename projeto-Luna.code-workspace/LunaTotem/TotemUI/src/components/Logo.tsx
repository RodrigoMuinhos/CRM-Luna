import { BrandSymbol } from "./BrandSymbol";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <BrandSymbol size={96} />
      <span className="text-3xl tracking-[0.4em] text-[#D3A67F] uppercase" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
        Lunavita
      </span>
    </div>
  );
}
