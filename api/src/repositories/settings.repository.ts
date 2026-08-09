import Settings, { SettingsDocument } from "../models/Settings";

const SETTINGS_ID = "system";

export const settingsRepository = {
  async get() {
    const existing = await Settings.findById(SETTINGS_ID);
    if (existing) return existing;
    // First-ever access: create the singleton with schema defaults.
    return Settings.create({ _id: SETTINGS_ID });
  },

  async getLean() {
    const doc = await this.get();
    return doc.toObject() as SettingsDocument;
  },

  update(data: Partial<SettingsDocument>) {
    return Settings.findByIdAndUpdate(
      SETTINGS_ID,
      { $set: { ...data, updatedAt: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  },
};
