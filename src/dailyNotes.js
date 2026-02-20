export function generateDailyNotePath(settings) {
  if (!settings) return null;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const fileName = settings.dailyFormat
    .replace("YYYY", year)
    .replace("MM", month)
    .replace("DD", day);

  return `${settings.dailyFolder}/${fileName}.md`;
}

export function createDailyNoteTemplate(date = new Date()) {
  const today = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `# Daily Note - ${today}\n\n## Tasks\n\n- [ ] \n\n## Notes\n\n`;
}
