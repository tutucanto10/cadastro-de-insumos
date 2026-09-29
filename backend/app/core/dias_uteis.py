"""
Contagem de dias úteis — usado pro alerta de prazo estourado (o email
de "A Fazer" promete 3 dias úteis pra análise). Simplificação
deliberada: pula sábado/domingo, não considera feriados.
"""

from datetime import datetime, timedelta, timezone


def tz_aware(dt: datetime) -> datetime:
    """
    Normaliza pra timezone-aware (UTC) antes de comparar datas — em
    produção (Postgres) as colunas de data já vêm com timezone, mas em
    dev (SQLite) vêm "naive"; Python não deixa comparar os dois tipos
    diretamente.
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def somar_dias_uteis(inicio: datetime, dias: int) -> datetime:
    atual = tz_aware(inicio)
    restantes = dias
    while restantes > 0:
        atual += timedelta(days=1)
        if atual.weekday() < 5:  # 0=segunda ... 4=sexta
            restantes -= 1
    return atual
