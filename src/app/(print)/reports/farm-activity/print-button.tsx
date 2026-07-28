'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        display:         'inline-flex',
        alignItems:      'center',
        gap:             '8px',
        padding:         '8px 20px',
        backgroundColor: '#1d4ed8',
        color:           'white',
        border:          'none',
        borderRadius:    '8px',
        fontSize:        '14px',
        fontWeight:      600,
        cursor:          'pointer',
      }}
    >
      🖨️ Imprimir / Salvar PDF
    </button>
  )
}
