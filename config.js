// Fecha de apertura en formato YYYYMMDDHHMMSS.
// Se interpreta en la zona horaria indicada en openingtimezone (nombre IANA).
// Ejemplo: openingdate = "20261101100000" + openingtimezone = "America/Argentina/Buenos_Aires"
//          => 1 de noviembre de 2026 a las 10:00 en Argentina.
// Cada visitante ve el mismo instante absoluto, expresado en SU hora local.
// Si openingtimezone queda vacío, la fecha se interpreta en la hora local del visitante.
// Dejar openingdate vacío para permitir abrir el regalo en cualquier momento.
//var openingdate = "20261101100000";
var openingdate = "20261101100000";
var openingtimezone = "America/Argentina/Buenos_Aires";
