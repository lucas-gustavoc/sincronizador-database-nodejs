const { query } = require('../db/mysql')

// Classe que irá receber dados completos de um pedido
class PedidoCompleto {
    constructor() {
        this.pedido = {
                id: 0,
                valotTotal: 0,
                frete: 0.0,
                data: 0,
                status: '',
                customer_id: 0
            }
        this.cliente = {
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
                    bairro: '',
                    cidade: '',
                    uf: '',
                    pais: '',
                    cep: ''
                },
                entrega: {
                    logradouro: '',
                    numero: '',
                    bairro: '',
                    cidade: '',
                    uf: '',
                    pais: '',
                    cep: ''
                }
            }
        }
        this.produtos = []
    }
    
}

const obterPedidoCompleto = async (pedido_id) => {
    
    const pedidoCompleto = new PedidoCompleto()
    const sql = {}

    // PEDIDO

    sql.sql = 'select order_id, total_sales, date_created, shipping_total, ' + 
                'customer_id, status from wp_wc_order_stats where order_id = ?'
    sql.values = [pedido_id]
    
    let dbData = await query(sql)

    if (dbData.length == 0) return Promise.resolve({}) // Pedido Inexistente

    pedidoCompleto.pedido.id = dbData[0].order_id
    pedidoCompleto.pedido.valotTotal = dbData[0].total_sales
    pedidoCompleto.pedido.frete = dbData[0].shipping_total
    pedidoCompleto.pedido.data = dbData[0].date_created
    pedidoCompleto.pedido.status = dbData[0].status
    pedidoCompleto.pedido.customer_id = dbData[0].customer_id

    // CLIENTE

    sql.sql = 'select wp_usermeta.* from wp_usermeta, wp_wc_customer_lookup where wp_wc_customer_lookup.customer_id = ? and wp_wc_customer_lookup.user_id = wp_usermeta.user_id'
    sql.values = [pedidoCompleto.pedido.customer_id]
    
    dbData = await query(sql)

    if (dbData.length == 0) return Promise.resolve({}) // Cliente Inexistente

    const clienteData = {}
    
    clienteData.user_id = dbData[0].user_id
    dbData.forEach(linha => {
        clienteData[linha.meta_key] = linha.meta_value
    })

    pedidoCompleto.cliente.id = clienteData.user_id
    pedidoCompleto.cliente.nome = (clienteData.billing_first_name + ' ' + clienteData.billing_last_name).trim()
    pedidoCompleto.cliente.telefone = []
    if (clienteData.billing_phone) pedidoCompleto.cliente.telefone.push(clienteData.billing_phone)
    if (clienteData.billing_cellphone) pedidoCompleto.cliente.telefone.push(clienteData.billing_cellphone)
    pedidoCompleto.cliente.email = clienteData.billing_email
    pedidoCompleto.cliente.cpf = clienteData.billing_cpf
    pedidoCompleto.cliente.cnpj = clienteData.billing_cnpj
    pedidoCompleto.cliente.endereco.faturamento.logradouro = clienteData.billing_address_1
    pedidoCompleto.cliente.endereco.faturamento.numero = clienteData.billing_number
    pedidoCompleto.cliente.endereco.faturamento.bairro = clienteData.billing_neighborhood
    pedidoCompleto.cliente.endereco.faturamento.cidade = clienteData.billing_city
    pedidoCompleto.cliente.endereco.faturamento.uf = clienteData.shipping_state
    pedidoCompleto.cliente.endereco.faturamento.pais = clienteData.shipping_country
    pedidoCompleto.cliente.endereco.faturamento.cep = clienteData.shipping_postcode
    pedidoCompleto.cliente.endereco.entrega.logradouro = clienteData.shipping_address_1
    pedidoCompleto.cliente.endereco.entrega.numero = clienteData.shipping_number
    pedidoCompleto.cliente.endereco.entrega.bairro = clienteData.shipping_neighborhood
    pedidoCompleto.cliente.endereco.entrega.cidade = clienteData.shipping_city
    pedidoCompleto.cliente.endereco.entrega.uf = clienteData.shipping_state
    pedidoCompleto.cliente.endereco.entrega.pais = clienteData.shipping_country
    pedidoCompleto.cliente.endereco.entrega.cep = clienteData.shipping_postcode

    // PRODUTOS

    sql.sql = 'select wp_wc_order_product_lookup.product_id, wp_wc_order_product_lookup.product_qty, ' + 
                'wp_wc_order_product_lookup.product_net_revenue, wp_wc_order_product_lookup.shipping_amount, ' +
                'wp_wc_product_meta_lookup.sku from wp_wc_order_product_lookup, wp_wc_product_meta_lookup ' +
                'where wp_wc_order_product_lookup.order_id = ? and wp_wc_order_product_lookup.product_id = ' +
                'wp_wc_product_meta_lookup.product_id'
    sql.values = [pedido_id]
    
    dbData = await query(sql)

    dbData.forEach((linha) => {
        pedidoCompleto.produtos.push({
            site_product_id: linha.product_id,
            sku: linha.sky,
            valor: linha.product_net_revenue,
            qtd: linha.product_qty,
            frete: linha.shipping_amount
        })
    })

    return pedidoCompleto

}

module.exports = { obterPedidoCompleto }