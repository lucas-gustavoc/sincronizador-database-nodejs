const validator = require('validator')
const express = require('express')
const router = new express.Router()
const db = require('../db/mysql')
const utils = require('./utils')
const auth = require('../middleware/auth')

// ALTERAÇÕES
// [x] Permitir alteração somente do código de rastreamento ou NFe, sem atualizar o status
// [x] Alterar o campo utilizado para o código de rastreamento
// [x] Inserir cadastro de chave de NFe
// [ ] Retornar mensagem diferente quando nenhum registro foi atualizado

// 34tg35t354vy4tr
// 867395820942948673053957395739583957395839476948

router.get('/', (req, res) => {
    res.send('<h3 style="font-family: sans-serif; margin: 0">API is working...</h3><p style="color: gray; margin: 0; font-style: italic; font-family: sans-serif">v. 1.5</p>')
})

router.get('/pedidos/:id', auth, async (req, res) => {
    const _id = req.params.id

    try {
        res.send(await utils.obterPedidoCompleto(_id))
    } catch (error) {
        if (error.erro) {
            // Manda o objeto erro em caso de erro no modelo padrão
            res.status(400).send(error)
        } else {
            // Caso não seja o modelo padrão, padroniza e manda
            res.status(400).send({ erro: error.message }) 
        }
    }
})

router.get('/pedidos/status/:status', auth, async (req, res) => {
    try {
        const sql = {}
        sql.sql = 'select order_id, total_sales from wp_wc_order_stats where status = ?'
        sql.values = [req.params.status]
        
        // Inserindo o limite de registros, caso exista
        const limite = req.query.limite
        if (limite && validator.isInt(limite)) {
            sql.sql = sql.sql.concat(' limit ?')
            sql.values.push(parseInt(limite))
        }

        res.send(await db.query(sql))
    } catch (error) {
        if (error.erro) {
            // Manda o objeto erro em caso de erro no modelo padrão
            res.status(400).send(error)
        } else {
            // Caso não seja o modelo padrão, padroniza e manda
            res.status(400).send({ erro: error.message }) 
        }
    }
})

router.get('/produtos/:sku', auth, async (req, res) => {
    const sku = req.params.sku

    try {
        res.send(await utils.obterProdutoCompleto(sku))
    } catch (error) {
        if (error.erro) {
            // Manda o objeto erro em caso de erro no modelo padrão
            res.status(400).send(error)
        } else {
            // Caso não seja o modelo padrão, padroniza e manda
            res.status(400).send({ erro: error.message }) 
        }
    }
})

router.patch('/pedidos/:id/status', auth, async (req, res) => {
    const _id = req.params.id
    const novoStatus = req.body.novoStatus
    const rastreamento = req.body.rastreamento
    const chaveNfe = req.body.nfe

    try {
        if (!novoStatus && !rastreamento && !chaveNfe) throw new Error('Necessário informar status, chave de NFe ou código de Rastreamento!')

        const sql = {}
        const updates = [] // Irá armazenar cada update realizado
        sql.msg = ''

        if (novoStatus) {
            sql.sql = 'update wp_wc_order_stats set status = ? where order_id = ?'
            sql.values = [ novoStatus, _id ]

            updates.push(await db.query(sql))

            if (updates[updates.length - 1].affectedRows < 0) {
                sql.msg = sql.msg.concat('Não foi possível atualizar o status. ')
            } else {
                sql.msg = sql.msg.concat('Status do pedido atualizado com sucesso. ')
            }
            
        }
        
        
        if (rastreamento) {
            sql.sql = 'update wp_postmeta set meta_value = ? where post_id = ? and meta_key = "my_code_track"'
            sql.values = [ rastreamento, _id ]
            
            updates.push(await db.query(sql))

            if (updates[updates.length - 1].affectedRows < 0) {
                sql.msg = sql.msg.concat('Não foi possível atualizar o rastreamento. ')
            } else {
                sql.msg = sql.msg.concat('Rastreamento atualizado com sucesso. ')
            }
        }

        if (chaveNfe) {
            sql.sql = 'update wp_postmeta set meta_value = ? where post_id = ? and meta_key = "my_key_note"'
            sql.values = [ chaveNfe, _id ]
            
            updates.push(await db.query(sql))

            if (updates[updates.length - 1].affectedRows < 0) {
                sql.msg = sql.msg.concat('Não foi possível atualizar a chave da NFe. ')
            } else {
                sql.msg = sql.msg.concat('Chave da NFe atualizada com sucesso. ')
            }
        }

        if (updates.every((update) => { return update.affectedRows > 0 })) {
            res.send({ ok: 'Pedido atualizado com sucesso!' })
        } else {
            res.send({ ok: sql.msg })
        }

    } catch (error) {
        if (error.erro) {
            // Manda o objeto erro em caso de erro no modelo padrão
            res.status(400).send(error)
        } else {
            // Caso não seja o modelo padrão, padroniza e manda
            res.status(400).send({ erro: error.message }) 
        }
    }
    
})

router.patch('/produtos/:sku/preco', auth, async (req, res) => {
    const sku = req.params.sku
    const precoDe = req.body.precoDe
    const precoPor = req.body.precoPor

    try {
        if ((precoDe && typeof precoDe == 'number') || (precoPor && typeof precoPor == 'number')) {

            const product_id = await utils.obterIdPeloSku(sku)

            if (!product_id) throw new Error('SKU informada não existe') // Enviar objeto vazio em caso de não existência do SKU

            // Atualizando preço na tabela wp_wc_product_meta_lookup

            let novosPrecos = {}
            if (precoDe && typeof precoDe == 'number') novosPrecos.max_price = parseFloat(precoDe)
            if (precoPor && typeof precoPor == 'number') novosPrecos.min_price = parseFloat(precoPor)

            const sql = {}
            sql.sql = 'update wp_wc_product_meta_lookup set ? where product_id = ?'
            sql.values = [ novosPrecos, product_id ]

            let update = await db.query(sql)

            // Atualizando preço na tabela wp_postmeta (apenas em caso de fornecimento do precoPor)

            if (precoPor && typeof precoPor == 'number') {
                novosPrecos = {}
                novosPrecos.meta_value = precoPor

                sql.sql = 'update wp_postmeta set ? where post_id = ? and (meta_key = "_price" or meta_key = "_regular_price")'
                sql.values = [ novosPrecos, product_id ]

                update = await db.query(sql)
            }
            

            if (update.affectedRows > 0) {
                res.send({ ok: 'Preços atualizados com sucesso!' })
            } else {
                res.send({ ok: 'Produto não encontrado!' })
            }
        } else {
            throw new Error('Um novo "Preço De" ou "Preço Por" precisa ser informado, ' +
                            'sendo necessário que estejam em formato numérico.')
        }
    } catch (error) {
        if (error.erro) {
            // Manda o objeto erro em caso de erro no modelo padrão
            res.status(400).send(error)
        } else {
            // Caso não seja o modelo padrão, padroniza e manda
            res.status(400).send({ erro: error.message }) 
        }
    }
})

router.patch('/produtos/:sku/estoque', auth, async (req, res) => {
    const sku = req.params.sku
    const estoque = req.body.estoque

    try {
        if (estoque && typeof estoque == 'number') {

            const product_id = await utils.obterIdPeloSku(sku)

            if (!product_id) throw new Error('SKU informada não existe') // Enviar objeto vazio em caso de não existência do SKU

            const sql = {}
            sql.sql = 'update wp_wc_product_meta_lookup set stock_quantity = ? where product_id = ?'
            sql.values = [ estoque, product_id ]

            const update = await db.query(sql)

            if (update.affectedRows > 0) {
                res.send({ ok: 'Estoque atualizado com sucesso!' })
            } else {
                res.send({ ok: 'Produto não encontrado!' })
            }
        } else {
            throw new Error('Um novo estoque precisa ser informado, sendo necessário' +
                            ' que esteja em formato numérico.')
        }
    } catch (error) {
        if (error.erro) {
            // Manda o objeto erro em caso de erro no modelo padrão
            res.status(400).send(error)
        } else {
            // Caso não seja o modelo padrão, padroniza e manda
            res.status(400).send({ erro: error.message }) 
        }
    }
})

module.exports = router