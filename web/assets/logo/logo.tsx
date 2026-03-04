import type { SVGAttributes } from "react";
import Image from "next/image";

const Logo = (props: SVGAttributes<SVGElement>) => {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/atomc.svg"
        alt="Atomic Logo"
        width={30}
        height={30}
        className="shrink-0"
      />
      <div className="flex flex-col justify-center">
        <span className="font-bold text-base leading-none tracking-tight text-white">Atomicals</span>
        <span className="text-xs text-muted-foreground font-medium mt-0.5">RDoM Area</span>
      </div>
    </div>
  );
};

export default Logo;
