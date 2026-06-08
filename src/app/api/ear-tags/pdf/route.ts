import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'
import { auth } from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { prisma } from '@/lib/prisma'
import type { LayoutJson } from '@/modules/ear-tags/types'

const MM_TO_PT = 2.8346     // 1 mm = 2.8346 pt

function mm(v: number) { return v * MM_TO_PT }

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return [r, g, b]
}

export async function GET(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const activeFarm = await getActiveFarm(session.user.id)
    if (!activeFarm) {
      return NextResponse.json({ error: 'Fazenda não encontrada' }, { status: 404 })
    }
    const { farmId } = activeFarm

    // ── Parâmetros ──────────────────────────────────────────
    const { searchParams } = req.nextUrl
    const templateId = searchParams.get('templateId')
    const animalIdsRaw = searchParams.get('animalIds')
    const copies = Math.min(10, Math.max(1, parseInt(searchParams.get('copies') ?? '1', 10) || 1))

    if (!templateId || !animalIdsRaw) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const animalIds = animalIdsRaw.split(',').filter(Boolean).slice(0, 200)
    if (animalIds.length === 0) {
      return NextResponse.json({ error: 'Nenhum animal selecionado' }, { status: 400 })
    }

    // ── Busca template + animais ────────────────────────────
    const [template, animals] = await Promise.all([
      prisma.earTagTemplate.findFirst({ where: { id: templateId, farmId } }),
      prisma.animal.findMany({
        where:  { id: { in: animalIds }, farmId, status: 'ACTIVE' },
        select: { id: true, tag: true, name: true },
        orderBy: { tag: 'asc' },
      }),
    ])

    if (!template) {
      return NextResponse.json({ error: 'Modelo não encontrado' }, { status: 404 })
    }
    if (animals.length === 0) {
      return NextResponse.json({ error: 'Nenhum animal ativo encontrado' }, { status: 404 })
    }

    // ── Farm name ────────────────────────────────────────────
    const farm = await prisma.farm.findUnique({
      where:  { id: farmId },
      select: { name: true },
    })
    const farmName = farm?.name ?? ''

    // ── Configurações do template ────────────────────────────
    const W   = mm(template.widthMm)
    const H   = mm(template.heightMm)
    const PAD = mm(template.paddingMm)
    const QR  = mm(template.qrSizeMm)

    const layout   = (template.layoutJson ?? {}) as LayoutJson
    const qrPos    = layout.qrPosition ?? 'right'
    const isBottom = qrPos === 'bottom'

    const [bgR, bgG, bgB]     = hexToRgb(template.bgColor)
    const [txR, txG, txB]     = hexToRgb(template.textColor)

    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'

    // ── Criar PDF ────────────────────────────────────────────
    const pdfDoc  = await PDFDocument.create()
    const fontM   = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontS   = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold)

    const mainFt = template.fontSizeMain
    const secFt  = template.fontSizeSecondary

    // ── Uma página por etiqueta × cópias ─────────────────────
    for (const animal of animals) {
      for (let c = 0; c < copies; c++) {
        const page = pdfDoc.addPage([W, H])

        // Fundo
        page.drawRectangle({
          x: 0, y: 0, width: W, height: H,
          color: rgb(bgR, bgG, bgB),
        })

        // Borda
        if (template.showBorder) {
          page.drawRectangle({
            x: 0.5, y: 0.5, width: W - 1, height: H - 1,
            borderColor: rgb(txR, txG, txB),
            borderWidth:  0.8,
            color:        rgb(bgR, bgG, bgB),
          })
        }

        // QR Code como PNG embutido
        const qrUrl    = `${appUrl}/animals/${animal.id}`
        const qrBuffer = await QRCode.toBuffer(qrUrl, {
          width:  Math.round(QR),
          margin: 1,
          color:  {
            dark:  template.textColor,
            light: template.bgColor,
          },
        })
        const qrImage = await pdfDoc.embedPng(qrBuffer)

        // ── Layout: posição do QR e área de texto ────────────

        let qrX: number, qrY: number
        let textX: number, textY: number, textWidth: number

        if (isBottom) {
          // QR abaixo do texto
          qrX     = (W - QR) / 2
          qrY     = PAD
          textX   = PAD
          textY   = H - PAD
          textWidth = W - PAD * 2
        } else if (qrPos === 'left') {
          // QR à esquerda
          qrX      = PAD
          qrY      = (H - QR) / 2
          textX    = PAD + QR + PAD
          textY    = H - PAD
          textWidth = W - PAD * 3 - QR
        } else {
          // QR à direita (padrão)
          qrX      = W - PAD - QR
          qrY      = (H - QR) / 2
          textX    = PAD
          textY    = H - PAD
          textWidth = W - PAD * 3 - QR
        }

        page.drawImage(qrImage, {
          x:      qrX,
          y:      qrY,
          width:  QR,
          height: QR,
        })

        // ── Linhas de texto ──────────────────────────────────

        let curY = textY

        if (template.showAnimalTag) {
          const tagText = animal.tag
          const fontSize = mainFt
          curY -= fontSize
          // Clamp ao textWidth
          const measured = fontMono.widthOfTextAtSize(tagText, fontSize)
          const scale    = measured > textWidth ? textWidth / measured : 1
          page.drawText(tagText, {
            x:        textX,
            y:        curY,
            size:     fontSize * scale,
            font:     fontMono,
            color:    rgb(txR, txG, txB),
            maxWidth: textWidth,
          })
          curY -= 2
        }

        if (template.showAnimalName && animal.name) {
          const fontSize = secFt
          curY -= fontSize
          page.drawText(animal.name, {
            x:        textX,
            y:        curY,
            size:     fontSize,
            font:     fontM,
            color:    rgb(txR, txG, txB),
            maxWidth: textWidth,
            opacity:  0.85,
          })
          curY -= 1
        }

        if (template.showFarmName && farmName) {
          const fontSize = secFt
          curY -= fontSize
          page.drawText(farmName, {
            x:        textX,
            y:        curY,
            size:     fontSize,
            font:     fontS,
            color:    rgb(txR, txG, txB),
            maxWidth: textWidth,
            opacity:  0.6,
          })
        }
      }
    }

    // ── Retorna PDF ──────────────────────────────────────────
    const pdfBytes = await pdfDoc.save()

    const filename = `etiquetas-${new Date().toISOString().slice(0, 10)}.pdf`

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch (error) {
    console.error('[ear-tags/pdf]', error)
    return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 })
  }
}
