import Language from "../models/Language.js";

async function updateOrCreateLanguage(userId, languages) {
  try {
    if (!Array.isArray(languages)) {
      throw new Error('Languages should be an array');
    }

    const updatedLanguages = await Promise.all(languages.map(async (language) => {
      const existingRecord = await Language.findOne({
        where: {
          serviceProviderId: userId,
          language: language.name
        }
      });
      console.log("language", language);
      let updatedLanguageRecord;

      if (existingRecord) {
        updatedLanguageRecord = await existingRecord.update({
          ...language,
          serviceProviderId: userId
        });
      } else {
        updatedLanguageRecord = await Language.create({
          ...language,
          serviceProviderId: userId
        });
      }
      return updatedLanguageRecord;
    }));

    return updatedLanguages;
  } catch (error) {
    throw new Error(error.message);
  }
}


async function fetchLanguagesByUserId(userId) {
  try {
    const languageData = await Language.findAll({
      where: { serviceProviderId: userId },
    });
    return languageData;
  } catch (error) {
    throw new Error(error.message);
  }
}

export { updateOrCreateLanguage, fetchLanguagesByUserId }