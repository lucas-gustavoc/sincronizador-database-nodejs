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


const retorno = {
    pedido: {
        id: 0,
        valotTotal: 0,
        frete: 0.0,
        data: 0,
        status: '',
        customer_id: 0
    },
    cliete: {
        id: 0,
        nome: '',
        telefone: [],
        email: '',
        cpf: '',
        cnpj: '',
        endereco: {
            faturamento: {
                logradouro: '',
                numero: '',
                complemento: '',
                cidade: '',
                uf: '',
                pais: '',
                cep: ''
            },
            entrega: {
                logradouro: '',
                numero: '',
                complemento: '',
                cidade: '',
                uf: '',
                pais: '',
                cep: ''
            }
        }
    },
    produtos: [
        {
            sku: '',
            valor: 58.99,
            qtd: 3
        },
        {
            sku: '',
            valor: 58.99,
            qtd: 3
        }
    ]
}


const filler = async () => {
    const sql = {}

    // PEDIDO

    sql.sql = 'select order_id, total_sales, date_created, shipping_total, ' + 
                'customer_id, status from wp_wc_order_stats where order_id = ?'
    sql.values = [7200]
    
    let dbData = await query(sql)

    if (dbData.length == 0) return Promise.reject('Pedido inexistente')

    retorno.pedido.id = dbData[0].order_id
    retorno.pedido.valotTotal = dbData[0].total_sales
    retorno.pedido.frete = dbData[0].shipping_total
    retorno.pedido.data = dbData[0].date_created
    retorno.pedido.status = dbData[0].status
    retorno.pedido.customer_id = dbData[0].customer_id

    // CLIENTE

    sql.sql = 'select * from wp_usermeta where user_id = ?'
    sql.values = [2]
    
    dbData = await query(sql)

    if (dbData.length == 0) return Promise.reject('Cliente inexistente')

    const clienteData = {}
    
    dbData.forEach(linha => {
        clienteData[linha.meta_key] = linha.meta_value
    })

    id = 2
    nome = clienteData.billing_first_name + ' ' + clienteData.billing_last_name
    telefone = []
    email = ''
    cpf = ''
    cnpj = ''
    endereco = ''
}

filler().catch((msg) => {
    console.log(msg)
})