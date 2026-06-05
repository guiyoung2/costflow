export type DailyUsage = {
  date: string; // 'YYYY-MM-DD'
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
};
