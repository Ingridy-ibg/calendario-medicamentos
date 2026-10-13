"""Gera os 4 toques do alarme dos especiais (alarme-tela-cheia, tarefa 1.8).

Sintetizados aqui, só com a biblioteca padrão, para não depender de áudio de
terceiros: os arquivos resultantes são do próprio projeto e ficam em CC0 (ver
modules/alarme-dose/SONS.md). Cada toque é um trecho curto pensado para tocar
em loop. Uso: python3 scripts/gerar-toques.py
"""

import math
import struct
import wave
from pathlib import Path

TAXA = 22050
DESTINO = Path(__file__).resolve().parent.parent / "modules/alarme-dose/android/src/main/res/raw"


def nota(freq, dur, parciais=((1, 1.0),), decaimento=4.0, ataque=0.01):
    amostras = []
    n = int(TAXA * dur)
    for i in range(n):
        t = i / TAXA
        env = min(1.0, t / ataque) * math.exp(-decaimento * t)
        valor = sum(a * math.sin(2 * math.pi * freq * m * t) for m, a in parciais)
        amostras.append(env * valor)
    return amostras


def silencio(dur):
    return [0.0] * int(TAXA * dur)


def misturar(*trilhas):
    tamanho = max(len(t) for t in trilhas)
    return [sum(t[i] for t in trilhas if i < len(t)) for i in range(tamanho)]


def deslocar(amostras, inicio):
    return silencio(inicio) + amostras


def gravar(nome, amostras):
    pico = max(abs(a) for a in amostras) or 1.0
    dados = b"".join(struct.pack("<h", int(a / pico * 0.85 * 32767)) for a in amostras)
    DESTINO.mkdir(parents=True, exist_ok=True)
    with wave.open(str(DESTINO / f"{nome}.wav"), "wb") as arquivo:
        arquivo.setnchannels(1)
        arquivo.setsampwidth(2)
        arquivo.setframerate(TAXA)
        arquivo.writeframes(dados)


def alvorada():
    # Arpejo ascendente de dó maior, suave, com uma pausa antes de repetir.
    harmonicos = ((1, 1.0), (2, 0.3), (3, 0.1))
    trilhas = [deslocar(nota(f, 0.9, harmonicos, 3.0), i * 0.22) for i, f in enumerate((523.25, 659.25, 783.99, 1046.5))]
    return misturar(*trilhas) + silencio(0.6)


def sino():
    # Sino com parciais inarmônicas, duas batidas.
    parciais = ((1, 1.0), (2.76, 0.5), (5.4, 0.25), (8.93, 0.12))
    batida = nota(880, 1.2, parciais, 2.5, 0.002)
    return misturar(batida, deslocar(nota(660, 1.2, parciais, 2.5, 0.002), 0.6)) + silencio(0.3)


def digital():
    # Quatro bipes curtos e uma pausa, como um despertador digital.
    bipe = [math.copysign(0.6, s) for s in nota(2000, 0.09, decaimento=0.0, ataque=0.002)]
    sequencia = []
    for _ in range(4):
        sequencia += bipe + silencio(0.07)
    return sequencia + silencio(0.6)


def marimba():
    # Frase curta de marimba (fundamental com o 4º harmônico, decaimento rápido).
    parciais = ((1, 1.0), (4, 0.35), (10, 0.05))
    frase = (587.33, 783.99, 880.0, 783.99, 1174.66)
    trilhas = [deslocar(nota(f, 0.5, parciais, 7.0, 0.003), i * 0.18) for i, f in enumerate(frase)]
    return misturar(*trilhas) + silencio(0.5)


if __name__ == "__main__":
    for nome, gerar in (("toque_alvorada", alvorada), ("toque_sino", sino), ("toque_digital", digital), ("toque_marimba", marimba)):
        gravar(nome, gerar())
        print(f"{nome}.wav")
