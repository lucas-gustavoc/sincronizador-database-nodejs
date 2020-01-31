const express = require('express')
const router = new express.Router()
const mysql = require('mysql')
const db = require('../db/mysql')

router.get('/pedidos/:id', (req, res) => {
    res.send('Aqui nós enviamos o pedido de id ' + req.params.id)
})

router.get('/pedidos/status/:status', async (req, res) => {
    try {
        const sql = 'select order_id, total_sales from wp_wc_order_stats where status = ?'
        const values = [req.params.status]
        res.send(await db.query({ sql, values }))
    } catch (error) {
        res.status(400).send(error)
    }
})

router.patch('/pedidos/:id/status', (req, res) => {
    res.send('Aqui nós vamos atualizar o status do pedido ' + req.params.id + ' para "' + req.body.novoStatus + '"')
})

router.patch('/produtos/:sku/preco', (req, res) => {
    res.send('Aqui nós vamos atualizar o valor do produto ' + req.params.sku + ' para ' + req.body.precoDe)
})

router.patch('/produtos/:sku/estoque', (req, res) => {
    res.send('Aqui nós vamos atualizar o estoque do produto ' + req.params.sku + ' para ' + req.body.estoque)
})

module.exports = router