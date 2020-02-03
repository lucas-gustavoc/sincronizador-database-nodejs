const mysql = require('mysql')
const fs = require('fs')

const jsonData = fs.readFileSync('./db/acesso.json').toString()
const connData = JSON.parse(jsonData)

// connection.connect((error) => {
//     if (error) {
//         return console.log('Erro ao conectar...')
//     }
// })

const query = (sql) => {
    const connection = mysql.createConnection(connData.dbsite)
    return new Promise((resolve, reject) => {
        connection.query(sql, (error, results, fields) => {
            
            // Fechando conexão antes de qualquer retorno
            connection.end()
            
            // Handling errors
            if (error) {
                reject({ erro: error.sqlMessage })
            }
            
            // Retornando resultado
            resolve(results)
        })
    })
}

module.exports = { query }