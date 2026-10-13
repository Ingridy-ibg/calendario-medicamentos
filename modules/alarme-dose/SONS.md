# Toques do alarme dos especiais

Os quatro toques do app ficam em `android/src/main/res/raw`. Foram
sintetizados pelo próprio projeto com `scripts/gerar-toques.py`, que usa só a
biblioteca padrão do Python, sem nenhum áudio de terceiros. Para gerar de novo,
rode `python3 scripts/gerar-toques.py`.

| Arquivo | Nome no app | Origem | Licença |
|---|---|---|---|
| `toque_alvorada.wav` | Alvorada (padrão) | arpejo de dó maior, sintetizado | CC0 1.0 |
| `toque_sino.wav` | Sino suave | sino com parciais inarmônicas, sintetizado | CC0 1.0 |
| `toque_digital.wav` | Bipe digital | quatro bipes de 2 kHz, sintetizados | CC0 1.0 |
| `toque_marimba.wav` | Marimba | frase curta de marimba, sintetizada | CC0 1.0 |

Os arquivos são WAV (PCM 16 bits, mono, 22 050 Hz), e não `.ogg` como o
design sugeria, porque o ambiente não tem um codificador Ogg. O `MediaPlayer`
do Android toca os dois formatos, e os quatro juntos somam cerca de 320 KB.

Um toque escolhido entre os do aparelho é guardado como `aparelho:<uri>`. Se
a URI deixar de existir, o serviço volta para a Alvorada.
