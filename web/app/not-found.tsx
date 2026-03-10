/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import dynamic from 'next/dynamic'
import Link    from 'next/link'

const GridScan  = dynamic(() => import('@/components/animations/grid_scan').then(m => m.GridScan), { ssr: false })
const ASCIIText = dynamic(() => import('@/components/animations/ascii_text'), { ssr: false })

export default function NotFound() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black flex items-center justify-center">

      {/* - BACKGROUND GRID - \\ */}
      <div className="absolute inset-0 z-0">
        <GridScan
          sensitivity         = {0.55}
          lineThickness       = {1}
          linesColor          = "#392e4e"
          gridScale           = {0.1}
          scanColor           = "#FF9FFC"
          scanOpacity         = {0.4}
          enablePost          = {true}
          bloomIntensity      = {0.6}
          chromaticAberration = {0.002}
          noiseIntensity      = {0.01}
          style               = {{ width: '100%', height: '100%' }}
        />
      </div>

      {/* - CONTENT - \\ */}
      <div className="relative z-10 flex flex-col items-center gap-4 text-center px-6 select-none">
        <div style={{ width: '800px', height: '280px' }}>
          <ASCIIText
            text          = "404"
            enableWaves   = {true}
            asciiFontSize = {6}
            textFontSize  = {320}
          />
        </div>
      </div>

    </div>
  )
}

