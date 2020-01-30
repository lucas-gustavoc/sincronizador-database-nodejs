// const db = require('./db/mysql')
const express = require('express')

const app = express()
const port = 3000

app.use(express.json())

app.get('/pedidos/:id', (req, res) => {
    res.send('Aqui nós enviamos o pedido de id ' + req.params.id)
})

app.get('/pedidos/status/:status', (req, res) => {
    res.send('Aqui nós enviamos todos os pedidos no status "' + req.params.status + '"')
})

app.patch('/pedidos/:id/status/:novostatus', (req, res) => {
    res.send('Aqui nós vamos atualizar o status do pedido ' + req.params.id + ' para "' + req.params.novostatus + '"')
})

app.patch('/produtos/:sku/preco/:novopreco', (req, res) => {
    res.send('Aqui nós vamos atualizar o valor do produto ' + req.params.sku + ' para ' + req.params.novopreco)
})

app.patch('/produtos/:sku/estoque/:novoestoque', (req, res) => {
    res.send('Aqui nós vamos atualizar o estoque do produto ' + req.params.sku + ' para ' + req.params.novoestoque)
})

app.listen(port, () => {
    console.log('Server listening on port ' + port)
})