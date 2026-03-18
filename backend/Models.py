from database import db
from werkzeug.security import generate_password_hash, check_password_hash

class Turno(db.Model):
    __tablename__ = "turno"
    id           = db.Column(db.Integer, primary_key=True)
    fecha        = db.Column(db.Date, nullable=False)
    hora         = db.Column(db.String(5), nullable=False)
    duracion     = db.Column(db.Integer, default=45)
    estado       = db.Column(db.String(20), default="pendiente")
    notas        = db.Column(db.Text)
    paciente_id  = db.Column(db.Integer, db.ForeignKey("paciente.id"), nullable=True)
    paciente     = db.relationship("Paciente", lazy="select")
    nombre_libre = db.Column(db.String(200))
    telefono     = db.Column(db.String(30))
    email        = db.Column(db.String(200))
    recordatorio_enviado = db.Column(db.Boolean, default=False)

class Paciente(db.Model):
    __tablename__ = "paciente"
    id       = db.Column(db.Integer, primary_key=True)
    nombre   = db.Column(db.String(100))
    apellido = db.Column(db.String(100))
    dni      = db.Column(db.String(20))

class Configuracion(db.Model):
    __tablename__ = "configuracion"
    clave = db.Column(db.String(50), primary_key=True)
    valor = db.Column(db.Text)

class Usuario(db.Model):
    __tablename__ = "usuario_turno"
    id       = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

    def set_password(self, pwd):
        self.password_hash = generate_password_hash(pwd)

    def check_password(self, pwd):
        return check_password_hash(self.password_hash, pwd)
