const axios = require("axios"); 
const uuid = require("uuid");
const nodemailer = require("nodemailer");
const fs = require("fs").promises;

function getForm(req) {
  return new Promise((res) => {
    let str = "";
    req.on("data", function (chunk) { //el archivo se leerá por trozos en vez de completamente.
      str += chunk;
    });
    req.on("end", function () {
      //console.log('str', str);
      const obj = JSON.parse(str);  //JSON.parse toma una cadena JSON y la transforma en un objeto de JavaScript
      res(obj);
    });
  });
}

//crear roomates con identificador unico gracias al uso de uuid
const crearRoommates = async () => {
  let resp = await axios.get("https://randomuser.me/api");  //la libreria  axios permite hacer peticiones http
  const datos = resp.data;
  const nombre = `${datos.results[0].name.first} ${datos.results[0].name.last}`;

  const nuevoRoommates = {
    id: uuid.v4(),
    nombre: nombre,
    debe: 0,
    recibe: 0,
  };
  await insertarRoommates(nuevoRoommates);
};


const insertarRoommates = async function (nuevoRoommates) {
  let archivo_db = await fs.readFile("db.json", "utf8"); // 
  archivo_db = JSON.parse(archivo_db); 
  archivo_db.roommates.push(nuevoRoommates); // con pusch agregar un nuevo usuario al array
  archivo_db = JSON.stringify(archivo_db); // Volver a transformar el contenido a String
  await fs.writeFile("db.json", archivo_db, "utf8"); // Sobreescribir el contenido del archivo 'db.json'
};

const mostrarRoommates = async function () {
  let archivo_db = await fs.readFile("db.json", "utf8");
  archivo_db = JSON.parse(archivo_db);
  return archivo_db.roommates;
};
const crearGasto = async (gasto) => {

  //validacion de campos
  let ExpRegSoloNumeros = new RegExp("^[0-9]+$");
  if (
    gasto.monto <= 0 ||
    gasto.descripcion.trim() == "" ||
    !ExpRegSoloNumeros.exec(gasto.monto) ||
    gasto.nombre == ""
  ) {
    return;
  }
 
  let archivo_db = await fs.readFile("db.json", "utf8");
  archivo_db = JSON.parse(archivo_db);
  //valida si existe el roommates en en el archivo db.json
  const roommate_gastador = archivo_db.roommates.find(
    (r) => r.nombre == gasto.roommates
  );
  if (!roommate_gastador) {
    throw "roommate no encontrado";
  }
   //___________________________________________________________
  
  const nuevoGasto = {
    id: uuid.v4(),
    roommates: gasto.roommates,
    descripcion: gasto.descripcion,
    monto: gasto.monto,
  };

  const correos = "reyesrmonicar2@gmail.com"; // para pruebas deje solo mi correo
  const mensaje = `<h2>Nuevo Gasto Ingresado</h2>
  <p>El roommates ${gasto.roommates},</p>
  <p>Agrego el gasto de: ${gasto.descripcion}</p>
  <p>Por un monto total de $: ${gasto.monto}</p>`;
  //  enviar(correos,'Gasto',mensaje)

  await insertarGastos(nuevoGasto);
  await actualizarRoommates(gasto.roommates, gasto.monto, 1, "");
};

const insertarGastos = async function (nuevoGasto) {
  let archivo_db = await fs.readFile("db.json", "utf8"); 
  archivo_db = JSON.parse(archivo_db); // Transformar cadena string  a un objeto de JS
  archivo_db.gastos.push(nuevoGasto); 
  archivo_db = JSON.stringify(archivo_db); 
  await fs.writeFile("db.json", archivo_db, "utf8"); 
};
const mostrarGastos = async function () {
  let archivo_db = await fs.readFile("db.json", "utf8");
  archivo_db = JSON.parse(archivo_db);
  return archivo_db.gastos;
};
const eliminarGasto = async (id) => {

  //se actualiza  el debe y recibe de los roommates
  await actualizarRoommates("", "", 2, id);

  //Eliminar Gasto
  let archivo_db = await fs.readFile("db.json", "utf8");
  archivo_db = JSON.parse(archivo_db);
  const id_gastoEli = archivo_db.gastos.find((g) => g.id == id);
  if (!id_gastoEli) {
    throw "gasto  no encontrado";
  }
  archivo_db.gastos = archivo_db.gastos.filter((gasto) => gasto.id != id);
  archivo_db = JSON.stringify(archivo_db);
  await fs.writeFile("db.json", archivo_db, "utf8");
};

const modificarGasto = async (id, nuevo_gasto) => {
  let ExpRegSoloNumeros = new RegExp("^[0-9]+$");
  if (
    nuevo_gasto.monto <= 0 ||
    nuevo_gasto.descripcion.trim() == "" ||
    !ExpRegSoloNumeros.exec(nuevo_gasto.monto) ||
    nuevo_gasto.nombre == ""
  ) {
    return;
  }

  let archivo_db = await fs.readFile("db.json", "utf8");
  archivo_db = JSON.parse(archivo_db);

  const id_gastoEli = archivo_db.gastos.find((g) => g.id == id);
  if (!id_gastoEli) {
    throw "gasto  no encontrado";
  }
  gasto_antiguo = archivo_db.gastos.find((gasto) => gasto.id == id);
  let nombre_antiguo = gasto_antiguo.roommates;
  let monto_antiguo = gasto_antiguo.monto;

  //obtener datos del roomates nuevo ( gasto)
  let nuevo_nombre = nuevo_gasto.roommates;
  let nuevo_monto = nuevo_gasto.monto;
  let nuevo_descripcion = nuevo_gasto.descripcion;

  //modificar ( gasto)
  gasto_antiguo.roommates = nuevo_nombre;
  gasto_antiguo.monto = nuevo_monto;
  gasto_antiguo.descripcion = nuevo_descripcion;

  archivo_db = JSON.stringify(archivo_db);
  await fs.writeFile("db.json", archivo_db, "utf8");
 

  actualizarRoommates(nombre_antiguo, monto_antiguo, 3, "", nuevo_gasto);
};
const actualizarRoommates = async ( nombre_roommates, montoGasto, caso, id,objetoGasto) => {
  let archivo_db = await fs.readFile("db.json", "utf8");
  archivo_db = JSON.parse(archivo_db);
  let total_gasto = 0;
  for (let gasto of archivo_db.gastos) {
    total_gasto += gasto.monto;
  }

  //Crear  un gasto
  if (caso == 1) {
    let debe = Math.round(total_gasto / archivo_db.roommates.length);

    for (let r = 0; r < archivo_db.roommates.length; r++) {
      archivo_db.roommates[r].debe = debe;
      if (nombre_roommates == `${archivo_db.roommates[r].nombre}`) {
        archivo_db.roommates[r].recibe += montoGasto;
      }
    }
    archivo_db = JSON.stringify(archivo_db);
    await fs.writeFile("db.json", archivo_db, "utf8");
  }
  //Eliminar un Gasto
  else if (caso == 2) {
    let gasto_rommie = archivo_db.gastos.filter((gasto) => gasto.id == id);
    let nombre = gasto_rommie[0].roommates;
    let monto = gasto_rommie[0].monto;

    total_gasto = total_gasto - monto;
    for (let l = 0; l < archivo_db.roommates.length; l++) {
      if (nombre == archivo_db.roommates[l].nombre) {
        archivo_db.roommates[l].recibe = archivo_db.roommates[l].recibe - monto;
      }
      archivo_db.roommates[l].debe = Math.round(total_gasto / archivo_db.roommates.length);
    }

    archivo_db = JSON.stringify(archivo_db);
    await fs.writeFile("db.json", archivo_db, "utf8");
  }
  //actualizar gasto
  else if (caso == 3) {
    nombreAntiguo = nombre_roommates;
    monto_antiguo = montoGasto;

    for (let roomates of archivo_db.roommates) {
      if (roomates.nombre == nombreAntiguo) {
        roomates.recibe = roomates.recibe - monto_antiguo;
      }
      if (roomates.nombre == objetoGasto.roommates) {
        roomates.recibe = roomates.recibe + objetoGasto.monto;
      }
      roomates.debe = Math.round(total_gasto / archivo_db.roommates.length);
    }
    archivo_db = JSON.stringify(archivo_db);
    await fs.writeFile("db.json", archivo_db, "utf8");
  }
};
//Email
const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "mbensan.test@gmail.com",
    pass: "dgdxbpvqozekxwkn",
  },
});

function enviar(receiver, asunto, mensaje) {
  let receivers = receiver.split(",");

  const options = {
    from: "mbensan.test@gmail.com",
    to: receivers,
    subject: asunto,
    html: mensaje,
  };

  transport.sendMail(options, function (err, info) {
    if (err) {
      console.log("enviading");
      console.log("error", err);
    } else {
      console.log(info);
    }
  });
}

module.exports = {
  getForm,
  crearRoommates,
  mostrarRoommates,
  mostrarGastos,
  eliminarGasto,
  modificarGasto,
  crearGasto,
};