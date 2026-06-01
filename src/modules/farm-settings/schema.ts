import { z } from 'zod'

export const updateFarmSettingsSchema = z.object({
  mainProductionLotId:    z.string().min(1).nullable().optional(),
  enableMilkParticipants: z.boolean().optional(),
  autoUpdateMilkStatus:   z.boolean().optional(),
  useEstimatedMilkPerCow: z.boolean().optional(),
})

export type UpdateFarmSettingsInput = z.infer<typeof updateFarmSettingsSchema>
