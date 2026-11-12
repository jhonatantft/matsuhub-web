/**
 * The semantic-search experiment (components/lab/search): the help center of a fictional online
 * store, 4 topics × 8 passages, in both languages, plus the interface copy. Resolved per language
 * on the server.
 */
export const SEARCH_TOPICS = [
  { id: "delivery", label: { pt: "Entrega", en: "Delivery" } },
  { id: "returns", label: { pt: "Trocas e devoluções", en: "Returns" } },
  { id: "payment", label: { pt: "Pagamento", en: "Payment" } },
  { id: "warranty", label: { pt: "Garantia", en: "Warranty" } },
] as const;

/** [topic index, passage]. */
export const SEARCH_CORPUS: readonly (readonly [number, { pt: string; en: string }])[] = [
  [0, { pt: "O prazo de entrega para as capitais do Sudeste é de 2 a 4 dias úteis após a confirmação do pagamento.", en: "Delivery to Southeast state capitals takes 2 to 4 business days after payment is confirmed." }],
  [0, { pt: "Para o Sul e o Centro-Oeste, a entrega leva de 3 a 6 dias úteis.", en: "Delivery to the South and Center-West takes 3 to 6 business days." }],
  [0, { pt: "Norte e Nordeste recebem em 5 a 10 dias úteis, dependendo da cidade.", en: "The North and Northeast receive orders in 5 to 10 business days, depending on the city." }],
  [0, { pt: "O frete é grátis em compras acima de R$ 299 para todo o Brasil.", en: "Shipping is free on orders over R$ 299 anywhere in Brazil." }],
  [0, { pt: "Você recebe o código de rastreio por e-mail e WhatsApp assim que o pedido sai do centro de distribuição.", en: "You get the tracking code by email and WhatsApp as soon as the order leaves the distribution center." }],
  [0, { pt: "Se ninguém estiver no endereço, a transportadora tenta entregar mais duas vezes antes de devolver o pedido.", en: "If nobody is at the address, the carrier tries to deliver two more times before returning the order." }],
  [0, { pt: "Pedidos feitos até as 14h em dias úteis são despachados no mesmo dia.", en: "Orders placed by 2 pm on business days ship the same day." }],
  [0, { pt: "Também dá para retirar o pedido sem custo em uma das lojas parceiras.", en: "You can also pick up your order free of charge at one of our partner stores." }],

  [1, { pt: "Você pode devolver qualquer produto em até 7 dias após o recebimento, sem precisar explicar o motivo.", en: "You can return any product within 7 days of receiving it, with no need to give a reason." }],
  [1, { pt: "Para trocar por outro tamanho ou cor, o prazo é de 30 dias, com o produto sem uso e na embalagem original.", en: "To exchange for another size or color you have 30 days, with the product unused and in its original packaging." }],
  [1, { pt: "Produtos usados ou sem etiqueta não podem ser trocados, exceto em caso de defeito.", en: "Used products or products without a tag cannot be exchanged, except in case of a defect." }],
  [1, { pt: "O frete da primeira troca é por nossa conta; a partir da segunda, ele é cobrado.", en: "Shipping for the first exchange is on us; from the second one on, it is charged." }],
  [1, { pt: "O reembolso cai em até 10 dias úteis depois que o produto devolvido chega ao nosso estoque.", en: "The refund arrives within 10 business days after the returned product reaches our warehouse." }],
  [1, { pt: "Para pedir uma devolução, acesse Meus pedidos, escolha o item e gere a etiqueta de postagem.", en: "To request a return, go to My orders, choose the item and generate the shipping label." }],
  [1, { pt: "Se o pagamento foi no cartão, o estorno aparece em até duas faturas.", en: "If you paid by card, the chargeback shows up within two statements." }],
  [1, { pt: "Produtos de higiene pessoal não aceitam devolução depois de abertos.", en: "Personal hygiene products cannot be returned once opened." }],

  [2, { pt: "Aceitamos cartão de crédito, Pix e boleto bancário.", en: "We accept credit cards, Pix and bank slips (boleto)." }],
  [2, { pt: "No cartão de crédito, dá para parcelar em até 10 vezes sem juros.", en: "With a credit card you can pay in up to 10 interest-free installments." }],
  [2, { pt: "Pagamentos via Pix têm 5% de desconto e são aprovados na hora.", en: "Pix payments get a 5% discount and are approved instantly." }],
  [2, { pt: "O boleto vence em 3 dias e o pedido só é separado depois da compensação.", en: "The bank slip expires in 3 days and the order is only picked after it clears." }],
  [2, { pt: "Se o cartão for recusado, confira o limite disponível ou tente outro cartão.", en: "If your card is declined, check your available limit or try another card." }],
  [2, { pt: "Cupons de desconto são aplicados no carrinho e não se somam a outras promoções.", en: "Discount coupons are applied in the cart and cannot be combined with other promotions." }],
  [2, { pt: "A nota fiscal é enviada por e-mail assim que o pedido é faturado.", en: "The invoice is sent by email as soon as the order is billed." }],
  [2, { pt: "Não guardamos o número completo do seu cartão: os dados ficam com o processador de pagamentos.", en: "We don't store your full card number: the data stays with the payment processor." }],

  [3, { pt: "Todos os produtos têm garantia de 90 dias contra defeitos de fabricação.", en: "Every product has a 90-day warranty against manufacturing defects." }],
  [3, { pt: "Eletrônicos têm garantia estendida de 12 meses direto com o fabricante.", en: "Electronics have an extended 12-month warranty directly with the manufacturer." }],
  [3, { pt: "Para acionar a garantia, envie fotos ou um vídeo do defeito pelo nosso atendimento.", en: "To use the warranty, send photos or a video of the defect through our support channel." }],
  [3, { pt: "A assistência técnica avalia o produto em até 15 dias e informa se haverá conserto ou troca.", en: "Technical support assesses the product within 15 days and tells you whether it will be repaired or replaced." }],
  [3, { pt: "A garantia não cobre quedas, contato com água ou uso fora das instruções.", en: "The warranty does not cover drops, contact with water or use outside the instructions." }],
  [3, { pt: "Se o conserto não for possível, você recebe um produto novo ou o valor de volta.", en: "If a repair isn't possible, you get a new product or your money back." }],
  [3, { pt: "Guarde a nota fiscal: ela é necessária para usar a garantia.", en: "Keep the invoice: you need it to use the warranty." }],
  [3, { pt: "Produtos com defeito em até 7 dias são trocados na hora, sem passar pela assistência.", en: "Products with a defect within 7 days are replaced on the spot, without going through technical support." }],
];

export const SEARCH_COPY = {
  aria: {
    pt: "Mapa 3D da central de ajuda: cada ponto é um trecho, agrupado por assunto. A pergunta vira um ponto novo, ligado aos trechos mais parecidos. O painel ao lado mostra os mesmos resultados em texto.",
    en: "3D map of the help center: each point is a passage, grouped by topic. The question becomes a new point, linked to the most similar passages. The panel next to it shows the same results as text.",
  },
  hint: { pt: "Arraste para girar · passe o mouse num ponto", en: "Drag to rotate · hover a point" },
  tour: { pt: "Tour automático · use qualquer controle para assumir", en: "Auto tour · use any control to take over" },
  noWebgl: {
    pt: "Seu navegador não abriu o mapa 3D, mas a busca ao lado funciona normalmente.",
    en: "Your browser couldn't open the 3D map, but the search next to it works as usual.",
  },
  base: { pt: "Base: central de ajuda de uma loja fictícia · {n} trechos", en: "Base: a fictional store's help center · {n} passages" },
  ask: { pt: "Pergunte à central de ajuda", en: "Ask the help center" },
  placeholder: { pt: "Ex.: posso devolver um presente?", en: "E.g. can I return a gift?" },
  submit: { pt: "Buscar", en: "Search" },
  presets: {
    pt: ["Quanto tempo demora a entrega no Sul?", "Posso trocar produtos usados?", "Dá para parcelar no cartão?", "Como faço uma reserva de hotel?"],
    en: ["How long does delivery to the South take?", "Can I exchange a used product?", "Can I pay in installments by card?", "How do I book a hotel room?"],
  },
  steps: [
    { pt: "Pergunta", en: "Question" },
    { pt: "Vetor", en: "Vector" },
    { pt: "Vizinhos", en: "Neighbours" },
    { pt: "Resposta", en: "Answer" },
  ],
  vector: { pt: "O vetor da pergunta: os pedaços que mais pesam", en: "The question's vector: the heaviest pieces" },
  results: { pt: "Trechos mais parecidos", en: "Most similar passages" },
  similarity: { pt: "semelhança", en: "similarity" },
  answer: { pt: "Resposta, com a fonte", en: "Answer, with its source" },
  source: { pt: "Fonte: trecho {n} · {topic}", en: "Source: passage {n} · {topic}" },
  noAnswer: {
    pt: "Não encontrei nada sobre isso na central de ajuda. Vou chamar uma pessoa do atendimento.",
    en: "I couldn't find anything about that in the help center. I'll hand you over to a person from support.",
  },
  noAnswerWhy: {
    pt: "Nenhum trecho passou do mínimo de semelhança ({min}). Em vez de inventar, o agente admite que não sabe.",
    en: "No passage cleared the minimum similarity ({min}). Instead of making something up, the agent admits it doesn't know.",
  },
  empty: { pt: "Escolha uma pergunta ou escreva a sua.", en: "Pick a question or write your own." },
  passage: { pt: "Trecho {n}", en: "Passage {n}" },
};
