export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
  if (!text) return "";
  
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const json = await response.json();
    
    if (json && json[0]) {
      return json[0].map((item: any) => item[0]).join('');
    }
    return text;
  } catch (error) {
    console.error("Translation API error:", error);
    return text; // Fallback to original text if API fails
  }
};
