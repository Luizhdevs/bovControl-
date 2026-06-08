'use client'

import type { EarTagTemplateInput } from '../schema'
import type { AnimalForEarTag, LayoutJson } from '../types'

const MM_TO_PX = 3.7795   // 96 DPI

interface TemplatePreviewProps {
  template:  Partial<EarTagTemplateInput>
  animal:    AnimalForEarTag
  farmName?: string
}

export function TemplatePreview({ template, animal, farmName = 'Fazenda Exemplo' }: TemplatePreviewProps) {
  const {
    widthMm           = 50,
    heightMm          = 25,
    paddingMm         = 3,
    fontSizeMain      = 14,
    fontSizeSecondary = 9,
    qrSizeMm          = 18,
    showAnimalName    = false,
    showAnimalTag     = true,
    showFarmName      = false,
    showBorder        = true,
    bgColor           = '#FFFFFF',
    textColor         = '#000000',
    layoutJson        = {},
  } = template

  const { qrPosition = 'right' } = layoutJson as LayoutJson

  // Scale to fit preview container (max ~280px wide)
  const scale    = Math.min(280 / (widthMm * MM_TO_PX), 1.8)
  const wPx      = widthMm  * MM_TO_PX * scale
  const hPx      = heightMm * MM_TO_PX * scale
  const padPx    = paddingMm * MM_TO_PX * scale
  const qrPx     = qrSizeMm * MM_TO_PX * scale
  const mainPt   = fontSizeMain      * scale * 0.75
  const secPt    = fontSizeSecondary * scale * 0.75

  const textContent = (
    <div
      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, gap: 1, minWidth: 0 }}
    >
      {showAnimalTag && (
        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: mainPt, color: textColor, lineHeight: 1.2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {animal.tag}
        </div>
      )}
      {showAnimalName && animal.name && (
        <div style={{ fontSize: secPt, color: textColor, opacity: 0.8, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {animal.name}
        </div>
      )}
      {showFarmName && (
        <div style={{ fontSize: secPt, color: textColor, opacity: 0.6, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {farmName}
        </div>
      )}
    </div>
  )

  const qrBlock = (
    <div
      style={{
        width:           qrPx,
        height:          qrPx,
        backgroundColor: textColor + '22',
        border:          `${Math.max(1, scale * 0.4)}px solid ${textColor}44`,
        borderRadius:    2,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:      0,
        fontSize:        secPt * 0.7,
        color:           textColor,
        opacity:         0.7,
        fontFamily:      'monospace',
      }}
    >
      QR
    </div>
  )

  const isBottom = qrPosition === 'bottom'
  const flexDir  = isBottom ? 'column' : 'row'
  const mainDir  = qrPosition === 'left' ? 'row-reverse' : 'row'

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        style={{
          width:           wPx,
          height:          hPx,
          padding:         padPx,
          backgroundColor: bgColor,
          border:          showBorder ? `${Math.max(1, scale * 0.5)}px solid ${textColor}` : '1px dashed #ccc',
          borderRadius:    3,
          display:         'flex',
          flexDirection:   isBottom ? 'column' : mainDir as 'row' | 'column',
          alignItems:      'center',
          gap:             padPx * 0.5,
          boxSizing:       'border-box',
          overflow:        'hidden',
          position:        'relative',
        }}
      >
        {isBottom ? (
          <>
            {textContent}
            {qrBlock}
          </>
        ) : (
          <>
            {qrPosition === 'left' ? (
              <>{qrBlock}{textContent}</>
            ) : (
              <>{textContent}{qrBlock}</>
            )}
          </>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground">
        {widthMm} × {heightMm} mm · {qrPosition === 'right' ? 'QR direita' : qrPosition === 'left' ? 'QR esquerda' : 'QR abaixo'}
      </span>
    </div>
  )
}
