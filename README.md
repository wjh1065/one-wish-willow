# One Wish Willow — You only get one wish.

영화 패러디 광고 「One Wish Willow」(https://www.youtube.com/watch?v=Sw3QHS8VNhA)를 픽셀로 옮긴, 조금 무서운 웹 장난감.
빨강·크림 삼각 상자에서 구멍 뚫린 초콜릿색 버드나무 가지를 꺼내, 소원을 하나 적고, **두 주먹을 동시에 꾹** 눌러
반으로 「CRACK!」 부러뜨린다. 그 순간 적은 소원이 화면에 덕지덕지 붙어 뒤덮고, 불이 꺼지고, 「It heard you.」 → 「It will be granted.」
→ 「Whatever it takes.」가 한 줄씩 뜬다. **소원은 기기당 평생 한 번**이다. 화면 글은 전부 짧은 영어다.

## 실행

```bash
uv sync
./run.sh               # http://localhost:8767 (WILLOW_PORT 로 바꿀 수 있다)
```

AI 호출도 API 키도 없다. 서버는 정적 파일만 준다. 소원은 브라우저 localStorage(`owwillow.wish.v1`)에만 남는다.

## 흐름

1. **ad**: 「You only get one wish. / Buy now.」, 상자와 가지 → Open the box
2. **open**: 상자가 빠지고 가지가 떠오른다.
3. **wish**: What do you wish for? (60자) → Make my wish → **모달** 「Are you sure? … it cannot be undone. You only get one chance.」 (Wait / I'm sure)
4. **snap**: 두 주먹 위에 「HOLD ▼」가 깜빡인다. **왼쪽·오른쪽 주먹을 동시에** 누르고 있어야 가지가 휜다.
   - 휴대폰: 두 손가락으로 화면 왼쪽 절반과 오른쪽 절반을 누른다(각 손가락이 따로 셈).
   - PC: 마우스 버튼이 하나라 ← → 키를 함께 누른다(A/F, J/L도 된다).
   - 한쪽만 누르면 「Both fists. At the same time.」, 누르다 놓으면 「Don't let go.」가 뜬다.
   - 휠수록 삐걱 소리와 심장 소리가 빨라지고, 화면이 떨리고 어두워진다.
5. **crack**: 섬광, 「CRACK!」, 흔들림, 부스러기. 이 순간 소원이 저장된다.
6. **소원 벽**: 적은 소원이 빨간 띠와 검은 글씨로 화면 여기저기에 한 장씩 붙는다. 처음엔 한두 장, 점점 빨라져 약 3초 만에 화면 전체를 덮고, 1초 넘게 천천히 사라진다. 붙을 때마다 툭 소리가 난다.
   그 뒤 어두워진 방에 낮은 웅웅거림이 깔리고 「It heard you.」 → 「It will be granted.」(쿵) → 「Whatever it takes.」가 천천히 떠오른다. 깜빡이는 연출은 없다. 마지막에 GRANTED 패널과 Save card.
7. **Save card**: 어두운 카드 이미지와 함께 **게임 링크**(「I made my one wish. You only get one.」 + 주소)를 보낸다.
   - 휴대폰: 공유 시트로 보낸다.
   - PC: 이미지를 내려받고 링크를 클립보드에 복사한다.
   - 카드에도 「Make yours: 주소」가 찍힌다.
8. **다시 오면**: 부러진 조각이 어둠 속에 그대로 있고 「It will be granted.」와 패널이 보인다.
9. **Reset**: 상단바 「Reset」 버튼(누구나 보임)으로 소원을 지우고 처음부터 할 수 있다. 예전 디버그 패널(`?debug=1`)은 없앴고, 남아 있던 켜짐 기록도 페이지가 지운다.

## 코드

```
server/app.py      정적 파일만 (no-cache)
web/index.html, style.css   상단바 고정(sticky), 어두운 방의 TV, 쿠폰 종이 패널 → 부러진 뒤엔 검붉은 패널
web/js/main.js     장면 상태 기계, 그리기, 양손 입력, 어둠 연출, 저장, 리셋
web/js/art.js      픽셀 그림을 코드로: 상자(사진 레퍼런스 배치), 격자 가지, 부러진 조각, 주먹, 글꼴
web/js/sound.js    WebAudio: 상자, 삐걱, 심장, 뚝, 웅웅, 쿵
web/js/card.js     공유 카드 + 링크
tools/e2e/         puppeteer: flow.mjs(전체, 390/1440 인자), crack_frames.mjs(뚝 순간 8프레임), modal_look.mjs
```

- **무대 크기**: 176×160으로 그려서 정수 배율로 키운다(휴대폰 2배, PC 4배).
- **같은 모양 다시 그리기**: 가지 모양과 부러지는 모양은 시드로 정해져서, 다시 열어도 같다.
