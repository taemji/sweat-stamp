const koreanNumberWords = ["한", "두", "세", "네", "다섯", "여섯", "일곱"];
const koreanOrdinalWords = ["첫", ...koreanNumberWords.slice(1)];

export function formatKoreanHeadcount(count: number) {
  return `${koreanNumberWords[count - 1] ?? count} 명`;
}

export function formatKoreanOrdinal(count: number) {
  return `${koreanOrdinalWords[count - 1] ?? count} 번째`;
}
