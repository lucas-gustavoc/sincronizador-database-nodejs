const express = require('express')
const router = require('./router')

const app = express()
const port = 3000

// Definindo formato de requisições para JSON
app.use(express.json())

// Ativando as rotas estabelecidas em router.js
app.use(router)

// Iniciando o servidor
app.listen(port, () => {
    console.log('Server listening on port ' + port)
})