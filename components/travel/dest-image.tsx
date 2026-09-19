import Image from "next/image";
import { cn } from "@/lib/utils";

/** next/image wrapper. SVG placeholders skip the optimizer; real photos get full optimization. */
export function DestImage({
  src,
  alt,
  priority,
  className,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={src.endsWith(".svg")}
      className={cn("object-cover", className)}
    />
  );
}
