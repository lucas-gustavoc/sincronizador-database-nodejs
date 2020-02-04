const fs = require('fs')

const auth = (req, res, next) => {
    const users = JSON.parse(fs.readFileSync('./src/users.json').toString())
    const token = req.header('Token')
    
    const isLogged = users.some((user) => {
        return user.token === token
    })

    isLogged ? next() : res.status(400).send({ erro: 'Usuário não autenticado. Necessário Token Válido.' })
}

module.exports = auth