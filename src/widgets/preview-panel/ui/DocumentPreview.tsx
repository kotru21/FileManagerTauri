import type { DocParagraph } from "@/shared/api/tauri/bindings"

export default function DocumentPreview({
  paragraphs,
  truncated,
}: {
  paragraphs: DocParagraph[]
  truncated: boolean
}) {
  return (
    <div className="h-full overflow-auto">
      <div className="p-4 max-w-prose space-y-1">
        {paragraphs.map((p, i) => {
          const key = `${i}-${p.style}`
          switch (p.style) {
            case "heading1":
              return (
                <h1 key={key} className="text-xl font-bold mt-4 mb-1">
                  {p.text}
                </h1>
              )
            case "heading2":
              return (
                <h2 key={key} className="text-lg font-semibold mt-3 mb-1">
                  {p.text}
                </h2>
              )
            case "heading3":
              return (
                <h3 key={key} className="text-base font-semibold mt-2 mb-1">
                  {p.text}
                </h3>
              )
            case "listItem":
              return (
                <p
                  key={key}
                  className="text-sm pl-4 before:content-['•'] before:mr-2 before:text-muted-foreground"
                >
                  {p.text}
                </p>
              )
            default:
              return (
                <p key={key} className="text-sm leading-relaxed">
                  {p.text}
                </p>
              )
          }
        })}
        {truncated && (
          <p className="text-muted-foreground italic text-sm mt-4">... (содержимое обрезано)</p>
        )}
      </div>
    </div>
  )
}
