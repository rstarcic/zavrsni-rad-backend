import Language from "../models/Language.js";

async function updateOrCreateLanguage(userId, languages) {
  try {
    if (!Array.isArray(languages)) {
      throw new Error('Languages should be an array');
    }
    console.log("Updating or creating languages for user ID:", userId);
    console.log("Languages array:", languages);
    const updatedLanguages = await Promise.all(languages.map(async (lang) => {
      console.log("Processing language:", lang);
      const existingRecord = await Language.findOne({
        where: {
          serviceProviderId: userId,
          language: lang.language
        }
      });
      console.log("Existing record:", existingRecord);
      let updatedLanguageRecord;

      if (existingRecord) {
        updatedLanguageRecord = await existingRecord.update({
          ...lang,
          serviceProviderId: userId
        });
      } else {
        updatedLanguageRecord = await Language.create({
          ...lang,
          serviceProviderId: userId
        });
      }
      console.log(updatedLanguageRecord);
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