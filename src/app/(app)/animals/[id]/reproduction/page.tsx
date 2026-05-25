import { redirect } from 'next/navigation'

/**
 * Redireciona links vindos de /animals/[id]/reproduction
 * (usados em animal-quick-actions) para o módulo canônico de reprodução.
 */
export default async function AnimalReproductionRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/reproduction/${id}`)
}
