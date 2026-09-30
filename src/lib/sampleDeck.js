export const SAMPLE_DECK = {
  title: 'Numbers 1 to 10',
  front_label: 'Digit',
  back_label: 'Portuguese',
  lang: 'pt-BR',
  color: 'lime',
  is_sample: true,
  csv_url: null,
  cards: [
    ['1', 'um|uma'], ['2', 'dois|duas'], ['3', 'três'], ['4', 'quatro'], ['5', 'cinco'],
    ['6', 'seis'], ['7', 'sete'], ['8', 'oito'], ['9', 'nove'], ['10', 'dez'],
  ].map(([front, back]) => ({ front, back })),
};
