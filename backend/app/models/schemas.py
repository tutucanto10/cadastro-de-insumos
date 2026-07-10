"""
Schemas Pydantic — validam o que entra na API e formatam o que sai.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator, model_validator

from app.models.insumo import TipoLocal, ColunaKanban, OrigemInsumo, ResponsavelChamado


class InsumoCriar(BaseModel):
    nome_insumo: str
    unidade_medida: str
    tipo_local: TipoLocal
    obra: Optional[str] = None
    detalhes: str
    marca: Optional[str] = None
    aplicacao: str
    solicitante_nome: str
    solicitante_email: EmailStr
    data_solicitacao: str
    responsavel_chamado: ResponsavelChamado

    @field_validator("obra")
    @classmethod
    def obra_obrigatoria_se_tipo_obra(cls, v, info):
        tipo_local = info.data.get("tipo_local")
        if tipo_local == TipoLocal.OBRA and not v:
            raise ValueError("Campo 'obra' é obrigatório quando tipo_local é 'obra'.")
        return v

    @field_validator("nome_insumo", "unidade_medida", "detalhes", "aplicacao", "solicitante_nome")
    @classmethod
    def nao_vazio(cls, v):
        if not v or not v.strip():
            raise ValueError("Campo não pode ser vazio.")
        return v.strip()


class InsumoMudarColuna(BaseModel):
    coluna: ColunaKanban
    motivo_cancelamento: Optional[str] = None

    # model_validator (não field_validator) porque field_validator não roda
    # quando o campo fica no valor padrão (None) — e é exatamente esse o
    # caso que precisamos barrar (cancelar sem mandar motivo nenhum).
    @model_validator(mode="after")
    def motivo_obrigatorio_se_cancelado(self):
        if self.coluna == ColunaKanban.CANCELADO:
            if not (self.motivo_cancelamento and self.motivo_cancelamento.strip()):
                raise ValueError("Campo 'motivo_cancelamento' é obrigatório ao cancelar.")
            self.motivo_cancelamento = self.motivo_cancelamento.strip()
        return self


class InsumoMudarResponsavelChamado(BaseModel):
    responsavel_chamado: ResponsavelChamado


class InsumoMudarInsumoAtendente(BaseModel):
    insumo_atendente: str

    @field_validator("insumo_atendente")
    @classmethod
    def nao_vazio(cls, v):
        if not v or not v.strip():
            raise ValueError("Campo não pode ser vazio.")
        return v.strip()


class InsumoResposta(BaseModel):
    id: str
    nome_insumo: str
    unidade_medida: str
    tipo_local: TipoLocal
    obra: Optional[str]
    local_exibicao: str
    detalhes: str
    marca: Optional[str]
    aplicacao: str
    solicitante_nome: str
    solicitante_email: str
    responsavel_nome: Optional[str]
    responsavel_email: Optional[str]
    responsavel_chamado: Optional[ResponsavelChamado]
    motivo_cancelamento: Optional[str]
    insumo_atendente: Optional[str]
    data_solicitacao: str
    coluna: ColunaKanban
    origem: OrigemInsumo
    criado_em: datetime
    atualizado_em: datetime

    model_config = {"from_attributes": True}


class EventoEmailResposta(BaseModel):
    id: str
    insumo_id: str
    destinatario_email: str
    coluna_anterior: Optional[str]
    coluna_nova: str
    assunto: str
    enviado_com_sucesso: bool
    erro: Optional[str]
    modo_simulado: bool
    criado_em: datetime

    model_config = {"from_attributes": True}
