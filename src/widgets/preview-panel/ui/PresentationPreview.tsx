import type { PresentationSlide } from "@/shared/api/tauri/bindings"

export default function PresentationPreview({ slides }: { slides: PresentationSlide[] }) {
  if (slides.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Пустая презентация</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 space-y-4">
        {slides.map((slide) => (
          <div key={slide.number} className="rounded-lg border border-border bg-muted/20 p-4">
            {/* Slide header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded bg-muted text-xs font-medium text-muted-foreground">
                {slide.number}
              </span>
              {slide.title && <h3 className="font-semibold text-sm truncate">{slide.title}</h3>}
            </div>

            {/* Slide content */}
            {slide.texts.length > 0 && (
              <div className="space-y-1 pl-7">
                {slide.texts.map((text, i) => (
                  <p
                    key={`${slide.number}-${i}`}
                    className="text-sm text-muted-foreground leading-relaxed"
                  >
                    {text}
                  </p>
                ))}
              </div>
            )}

            {slide.texts.length === 0 && !slide.title && (
              <p className="text-xs text-muted-foreground italic pl-7">(пустой слайд)</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
