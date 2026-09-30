// Sample decks offered on the empty home screen.

export const SAMPLE_DECKS = {
  portuguese: {
    title: 'Numbers in Portuguese',
    front_label: 'Digit',
    back_label: 'Portuguese',
    lang: 'pt-BR',
    color: 'red',
    shape: 'red',
    is_sample: true,
    csv_url: null,
    cards: [
      ['1', 'um|uma'], ['2', 'dois|duas'], ['3', 'três'], ['4', 'quatro'], ['5', 'cinco'],
      ['6', 'seis'], ['7', 'sete'], ['8', 'oito'], ['9', 'nove'], ['10', 'dez'],
    ].map(([front, back]) => ({ front, back })),
  },
  multiplication: {
    title: 'Multiplication tables',
    front_label: 'Problem',
    back_label: 'Answer',
    lang: 'en-US',
    color: 'green',
    shape: 'green',
    is_sample: true,
    csv_url: null,
    // 2 × 2 up to 9 × 9
    cards: Array.from({ length: 8 }, (_, i) => i + 2).flatMap((a) =>
      Array.from({ length: 8 }, (_, j) => j + 2).map((b) => ({ front: `${a} × ${b}`, back: String(a * b) }))),
  },
};
