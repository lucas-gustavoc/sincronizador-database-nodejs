const mysql = require('mysql')
const fs = require('fs')

const jsonData = fs.readFileSync('./db/acesso.json').toString()
const connData = JSON.parse(jsonData)

const connection = mysql.createConnection(connData.dbsite)

connection.connect((error) => {
    if (error) {
        return console.log('Erro ao conectar...')
    }

    console.log('Conectado com sucesso! ID: ', connection.threadId)
})