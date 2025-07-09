const db = require('./db');

const checkSystemStatus = async () => {
  try {
    console.log('🔍 Verificando status do sistema QuickPainel...\n');

    // 1. Verificar conexão com banco de dados
    console.log('📊 1. Verificando conexão com banco de dados...');
    try {
      await db.query('SELECT 1');
      console.log('✅ Conexão com banco de dados: OK');
    } catch (error) {
      console.log('❌ Erro na conexão com banco de dados:', error.message);
      return;
    }

    // 2. Verificar tabelas principais
    console.log('\n📋 2. Verificando estrutura das tabelas...');
    const tables = [
      'users', 'establishments', 'categories', 'products', 
      'option_groups', 'options', 'orders', 'order_items'
    ];

    for (const table of tables) {
      try {
        const [result] = await db.query(`SHOW TABLES LIKE '${table}'`);
        if (result.length > 0) {
          console.log(`✅ Tabela ${table}: Existe`);
        } else {
          console.log(`❌ Tabela ${table}: Não encontrada`);
        }
      } catch (error) {
        console.log(`❌ Erro ao verificar tabela ${table}:`, error.message);
      }
    }

    // 3. Verificar dados existentes
    console.log('\n📈 3. Verificando dados existentes...');
    
    // Usuários
    const [users] = await db.query('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Usuários: ${users[0].count}`);

    // Estabelecimentos
    const [establishments] = await db.query('SELECT COUNT(*) as count FROM establishments');
    console.log(`🏪 Estabelecimentos: ${establishments[0].count}`);

    // Categorias
    const [categories] = await db.query('SELECT COUNT(*) as count FROM categories');
    console.log(`📂 Categorias: ${categories[0].count}`);

    // Produtos
    const [products] = await db.query('SELECT COUNT(*) as count FROM products');
    console.log(`🍔 Produtos: ${products[0].count}`);

    // Grupos de opções
    const [optionGroups] = await db.query('SELECT COUNT(*) as count FROM option_groups');
    console.log(`📦 Grupos de opções: ${optionGroups[0].count}`);

    // Opções
    const [options] = await db.query('SELECT COUNT(*) as count FROM options');
    console.log(`🍽️ Opções: ${options[0].count}`);

    // Pedidos
    const [orders] = await db.query('SELECT COUNT(*) as count FROM orders');
    console.log(`📝 Pedidos: ${orders[0].count}`);

    // 4. Verificar estabelecimentos específicos
    console.log('\n🏪 4. Detalhes dos estabelecimentos...');
    const [establishmentDetails] = await db.query(`
      SELECT e.id, e.name, e.email, e.phone, e.address,
             COUNT(p.id) as products_count,
             COUNT(og.id) as option_groups_count,
             COUNT(o.id) as options_count
      FROM establishments e
      LEFT JOIN products p ON e.id = p.establishment_id
      LEFT JOIN option_groups og ON e.id = og.establishment_id
      LEFT JOIN options o ON og.id = o.group_id
      GROUP BY e.id
    `);

    if (establishmentDetails.length === 0) {
      console.log('⚠️ Nenhum estabelecimento encontrado');
    } else {
      establishmentDetails.forEach(est => {
        console.log(`\n📋 Estabelecimento: ${est.name}`);
        console.log(`   📧 Email: ${est.email}`);
        console.log(`   📞 Telefone: ${est.phone}`);
        console.log(`   📍 Endereço: ${est.address}`);
        console.log(`   🍔 Produtos: ${est.products_count}`);
        console.log(`   📦 Grupos de opções: ${est.option_groups_count}`);
        console.log(`   🍽️ Opções: ${est.options_count}`);
      });
    }

    // 5. Verificar problemas comuns
    console.log('\n🔧 5. Verificando problemas comuns...');

    // Produtos sem categoria
    const [productsWithoutCategory] = await db.query(`
      SELECT COUNT(*) as count FROM products WHERE category_id IS NULL
    `);
    if (productsWithoutCategory[0].count > 0) {
      console.log(`⚠️ Produtos sem categoria: ${productsWithoutCategory[0].count}`);
    } else {
      console.log('✅ Todos os produtos têm categoria');
    }

    // Opções sem grupo
    const [optionsWithoutGroup] = await db.query(`
      SELECT COUNT(*) as count FROM options WHERE group_id IS NULL
    `);
    if (optionsWithoutGroup[0].count > 0) {
      console.log(`⚠️ Opções sem grupo: ${optionsWithoutGroup[0].count}`);
    } else {
      console.log('✅ Todas as opções têm grupo');
    }

    // Grupos sem opções
    const [groupsWithoutOptions] = await db.query(`
      SELECT og.name, og.id
      FROM option_groups og
      LEFT JOIN options o ON og.id = o.group_id
      WHERE o.id IS NULL
    `);
    if (groupsWithoutOptions.length > 0) {
      console.log(`⚠️ Grupos sem opções: ${groupsWithoutOptions.length}`);
      groupsWithoutOptions.forEach(group => {
        console.log(`   - ${group.name} (ID: ${group.id})`);
      });
    } else {
      console.log('✅ Todos os grupos têm opções');
    }

    // 6. Verificar configurações
    console.log('\n⚙️ 6. Verificando configurações...');
    
    // Verificar se há usuários do tipo ESTABLISHMENT
    const [establishmentUsers] = await db.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'ESTABLISHMENT'
    `);
    console.log(`👨‍💼 Usuários estabelecimento: ${establishmentUsers[0].count}`);

    // Verificar se há usuários do tipo CUSTOMER
    const [customerUsers] = await db.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'CUSTOMER'
    `);
    console.log(`👤 Usuários cliente: ${customerUsers[0].count}`);

    // 7. Recomendações
    console.log('\n💡 7. Recomendações:');
    
    if (establishments[0].count === 0) {
      console.log('🔴 CRÍTICO: Crie pelo menos um estabelecimento');
    }
    
    if (categories[0].count === 0) {
      console.log('🟡 IMPORTANTE: Crie categorias para organizar produtos');
    }
    
    if (products[0].count === 0) {
      console.log('🟡 IMPORTANTE: Adicione produtos ao cardápio');
    }
    
    if (optionGroups[0].count === 0) {
      console.log('🟡 SUGESTÃO: Crie grupos de opções para personalização');
    }
    
    if (options[0].count === 0) {
      console.log('🟡 SUGESTÃO: Adicione opções aos grupos');
    }

    console.log('\n✅ Verificação do sistema concluída!');
    
    // Status geral
    const hasData = establishments[0].count > 0 && categories[0].count > 0 && products[0].count > 0;
    if (hasData) {
      console.log('\n🎉 Sistema está pronto para uso!');
    } else {
      console.log('\n⚠️ Sistema precisa de dados básicos para funcionar completamente.');
      console.log('💡 Execute: node seed-test-data.js para popular dados de teste');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar status do sistema:', error);
  } finally {
    process.exit(0);
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  checkSystemStatus();
}

module.exports = checkSystemStatus; 