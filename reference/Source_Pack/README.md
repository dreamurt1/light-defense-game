# 중앙 광원 스프라이트 팩

- 생성일: 2026-11-24 (KST)
- 구성: `source_bright.png`, `source_dim.png`, `source_off.png`
- 캔버스: 512×688 RGBA PNG, 투명 배경
- 앵커: 제단 바닥 y=667, 가로 중심 x=256
- 세 상태는 같은 세 단 돌 제단·금 간 결정·소품 배치와 축척을 공유함
- 큰 광도 효과는 포함하지 않음(게임에서 별도 처리)
- 바닥 그림자·글자 없음

## 상태

- **bright**: 종이색 중심을 가진 호박빛 결정, 제단 주변의 작은 따뜻한 불빛
- **dim**: 약하고 붉은 주황빛으로 식어 가는 결정, 거의 꺼진 주변 불빛
- **off**: 잿빛으로 빛을 잃은 결정과 꺼진 촛불, 차분한 남보라 돌색

## 참고 및 프롬프트 요약

- 그림체 참고: `C:\Users\user\light_defense_game\reference\Home_Art_Pack\home-bg-portrait.png`, `C:\Users\user\light_defense_game\reference\Passive_Pack\owl\owl_walk_090_right_f01.png`
- 규격: `C:\Users\user\light_defense_game\hand-offs\chatgpt-remaining-art-26-1124-0950\order-remaining-art.md` ① 중앙 광원
- 기본 프롬프트: 약간 기울인 톱다운의 세 단 둥근 돌 제단, 위에는 큰 금 간 결정. 이끼·작은 꽃·작은 불빛, 부드러운 2.5D 채색과 자두색 외곽선. 결정은 별이나 등불이 아닌 자연 결정으로 표현.
- dim/off는 밝음 시안의 형태·구도·크기를 고정하고 빛의 상태와 색만 바꾸도록 편집 생성.
- 세 원본을 동일한 비율·위치로 정규화해 같은 캔버스에 배치함.
