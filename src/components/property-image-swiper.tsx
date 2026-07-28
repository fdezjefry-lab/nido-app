import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState, type ReactNode } from "react";

export function PropertyImageSwiper({
  images,
  alt,
  children,
}: {
  images: string[];
  alt: string;
  children?: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const next = () => setIndex((i) => (i + 1) % images.length);
  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl">
        <img
          src={images[index]}
          alt={`${alt} - foto ${index + 1}`}
          width={1344}
          height={896}
          onClick={() => setIsFullscreen(true)}
          className="h-[48vh] min-h-96 w-full cursor-zoom-in object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent pointer-events-none" />
        {children}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Foto anterior"
              className="absolute left-4 top-1/2 -translate-y-1/2 grid size-10 place-items-center rounded-full bg-background/70 backdrop-blur transition hover:bg-background"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={next}
              aria-label="Foto siguiente"
              className="absolute right-4 top-1/2 -translate-y-1/2 grid size-10 place-items-center rounded-full bg-background/70 backdrop-blur transition hover:bg-background"
            >
              <ChevronRight className="size-5" />
            </button>
            <span className="absolute right-4 top-4 rounded-full bg-background/70 px-3 py-1 text-xs font-medium backdrop-blur">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/95 p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            onClick={() => setIsFullscreen(false)}
            aria-label="Cerrar"
            className="absolute right-5 top-5 grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="size-6" />
          </button>
          <img
            src={images[index]}
            alt={`${alt} - foto ${index + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Foto anterior"
                className="absolute left-4 top-1/2 -translate-y-1/2 grid size-12 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Foto siguiente"
                className="absolute right-4 top-1/2 -translate-y-1/2 grid size-12 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <ChevronRight className="size-6" />
              </button>
              <span className="absolute bottom-5 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white">
                {index + 1} / {images.length}
              </span>
            </>
          )}
        </div>
      )}
    </>
  );
}
