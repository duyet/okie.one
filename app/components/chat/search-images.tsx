import Image from "next/image"
import { useState } from "react"

import { addUTM, getFavicon, getSiteName } from "./utils"

type ImageResult = {
  title: string
  imageUrl: string
  sourceUrl: string
}

export function SearchImages({ results }: { results: ImageResult[] }) {
  const [hiddenIndexes, setHiddenIndexes] = useState<Set<number>>(new Set())

  const handleError = (index: number) => {
    setHiddenIndexes((prev) => new Set(prev).add(index))
  }

  if (!results?.length) return null

  return (
    <div className="my-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {results.map((img, i) => {
        const favicon = getFavicon(img.sourceUrl)
        return hiddenIndexes.has(i) ? null : (
          <a
            key={`${img.sourceUrl}-${i}`}
            href={addUTM(img.sourceUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="group/image relative block overflow-hidden rounded-xl"
          >
            <Image
              src={img.imageUrl}
              alt={img.title}
              onError={() => handleError(i)}
              onLoad={(e) => e.currentTarget.classList.remove("opacity-0")}
              className="h-full max-h-48 min-h-40 w-full object-cover opacity-0 transition-opacity duration-150 ease-out"
            />
            <div className="absolute right-0 bottom-0 left-0 flex flex-col gap-0.5 bg-primary px-2.5 py-1.5 opacity-0 transition-opacity duration-100 ease-out group-hover/image:opacity-100">
              <div className="flex items-center gap-1">
                {favicon && (
                  <Image
                    src={favicon}
                    alt="favicon"
                    className="h-4 w-4 rounded-full"
                  />
                )}
                <span className="line-clamp-1 text-secondary text-xs">
                  {getSiteName(img.sourceUrl)}
                </span>
              </div>
              <span className="line-clamp-1 text-secondary text-xs">
                {img.title}
              </span>
            </div>
          </a>
        )
      })}
    </div>
  )
}
