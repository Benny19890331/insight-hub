CREATE TABLE public.domain_knowledge (
  id INTEGER PRIMARY KEY DEFAULT 1,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT singleton CHECK (id = 1)
);

GRANT SELECT ON public.domain_knowledge TO authenticated;
GRANT ALL ON public.domain_knowledge TO service_role;

ALTER TABLE public.domain_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read domain knowledge"
  ON public.domain_knowledge FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert domain knowledge"
  ON public.domain_knowledge FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update domain knowledge"
  ON public.domain_knowledge FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.domain_knowledge (id, content) VALUES (1,
$kb$【領域背景】
本系統服務於「保健食品 × 多層次傳銷（直銷）」事業夥伴。
對話中常出現：上線 / 下線 / 開發 / 組織 / 業績 / 推薦 / 分享。
請以「事業夥伴、健康分享」的正向語氣理解，
**絕對不要**使用「客戶、推銷、成交、銷售」等冷感商業字眼。

【專有產品名詞字典】（這些是正式產品名稱，請務必正確辨識，不要翻譯、不要改寫、不要當錯字修正）
- 識霸：超級綜合植化素。
- 明利多：加強版植化素，在「識霸」的基礎上多添加山桑子萃取物，效果可達 3.2 倍。
- 水素水：含氫水，具有清除羥基自由基的功能。
- 喚活：能刺激人體本身的幹細胞，讓新長出的細胞健康正常。

【辨識規則】
1. 看到上述詞彙，視為正式產品名稱原樣保留（例：「明利多」≠「明利」、「水素水」≠「水素」、「喚活」≠「換活/煥活」）。
2. 若是語音輸入近音字（例：是霸 / 識爸 / 明力多 / 名利多 / 煥活 / 換活 / 水速水），請自動對應到正確名稱。
3. 提及產品時，僅依上述字典說明其定位與差異，**不可捏造**未列出的成分、療效、適應症或醫療宣稱。
4. 若使用者沒提到產品，不要硬塞產品資訊。$kb$
);