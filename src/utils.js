const { query } = require('../db/mysql')
const wooCommerceApi = require('@woocommerce/woocommerce-rest-api').default
const fs = require('fs')

// Preparando conexão com a API do WooCommerce. Ela será utilizada apenas em alguns casos
const wooCommerceConnData = JSON.parse(fs.readFileSync('./src/woocommerce.json').toString())

const wooCommerce = new wooCommerceApi({
    url: wooCommerceConnData.url,
    consumerKey: wooCommerceConnData.ck,
    consumerSecret: wooCommerceConnData.cs,
    version: 'wc/v3'
})

// Classe que irá receber dados completos de um pedido
class PedidoCompleto {
    constructor() {
        this.pedido = {
                id: 0,
                valorTotal: 0,
                frete: 0.0,
                dataDeCriacao: 0,
                status: '',
                tipoDeFrete: '',
                dataDePagamento: ''
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
    pedidoCompleto.pedido.valorTotal = dbData[0].total_sales
    pedidoCompleto.pedido.frete = dbData[0].shipping_total
    pedidoCompleto.pedido.dataDeCriacao = dbData[0].date_created
    pedidoCompleto.pedido.status = dbData[0].status

    const wcApiData = await wooCommerce.get('orders/' + pedido_id)
    pedidoCompleto.pedido.dataDePagamento = wcApiData.data.date_paid
    

    // PEDIDO > Obtendo customer_id para uso posterior.

    const customer_id = dbData[0].customer_id

    // PEDIDO > Identificando tipo de frete para o pedido

    sql.sql = 'select order_item_name from wp_woocommerce_order_items where order_item_type = "shipping" and order_id = ?'
    sql.values = [pedido_id]
    
    dbData = await query(sql)

    if (dbData.length > 0) pedidoCompleto.pedido.tipoDeFrete = dbData[0].order_item_name
    
    // CLIENTE

    sql.sql = 'select wp_usermeta.* from wp_usermeta, wp_wc_customer_lookup where wp_wc_customer_lookup.customer_id = ? and wp_wc_customer_lookup.user_id = wp_usermeta.user_id'
    sql.values = [customer_id]
    
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

    sql.sql = 'select wp_posts.post_title, wp_wc_order_product_lookup.product_id, wp_wc_order_product_lookup.product_qty, ' + 
                'wp_wc_order_product_lookup.product_net_revenue, wp_wc_order_product_lookup.shipping_amount ' +
                'from wp_wc_order_product_lookup, wp_posts, wp_wc_product_meta_lookup ' +
                'where wp_wc_order_product_lookup.order_id = ? and wp_wc_order_product_lookup.product_id = ' +
                'wp_wc_product_meta_lookup.product_id and wp_posts.ID = wp_wc_product_meta_lookup.product_id'
    sql.values = [pedido_id]
    
    dbData = await query(sql)

    let i
    for (i = 0; i < dbData.length; i++) {
        sql.sql = 'select meta_value from wp_postmeta where meta_key = "my_inventory_ref" and post_id = ?'
        sql.values = [dbData[i].product_id]
        const prodData = await query(sql)
        dbData[i].sku = (prodData.length > 0) ? prodData[0].meta_value : 0
    }

    dbData.forEach((linha) => {
        pedidoCompleto.produtos.push({
            site_product_id: linha.product_id,
            sku: linha.sku,
            nomeDoProduto: linha.post_title,
            valor: linha.product_net_revenue,
            qtd: linha.product_qty,
            frete: linha.shipping_amount
        })
    })

    return pedidoCompleto

}

const obterProdutoCompleto = async (sku) => {

    const sql = {}
    sql.sql = 'select post_id from wp_postmeta where meta_key = "my_inventory_ref" and meta_value = ?'
    sql.values = [sku]
    const dbData = await query(sql)
    
    if (dbData.length === 0) return Promise.resolve({}) // SKU Inexistente

    const produto_id = dbData[0].post_id
    const wcApiData = await wooCommerce.get('products/' + produto_id)
    return wcApiData.data
}

const obterIdPeloSku = async (sku) => {
    const sql = {}
    sql.sql = 'select post_id from wp_postmeta where meta_key = "my_inventory_ref" and meta_value = ?'
    sql.values = [sku]
    const dbData = await query(sql)
    
    return (dbData[0]) ? dbData[0].post_id : undefined
}

module.exports = { obterPedidoCompleto, obterProdutoCompleto, obterIdPeloSku }