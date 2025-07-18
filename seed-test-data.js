const db = require('./db');

const seedTestData = async () => {
  try {
    console.log('🌱 Iniciando população de dados de teste...');

    // Verificar se existe um estabelecimento de teste
    const [establishments] = await db.query('SELECT id FROM establishments LIMIT 1');
    
    if (establishments.length === 0) {
      console.log('❌ Nenhum estabelecimento encontrado. Crie um estabelecimento primeiro.');
      return;
    }

    const establishmentId = establishments[0].id;
    console.log(`📋 Usando estabelecimento ID: ${establishmentId}`);

    // Criar categorias de teste
    const categories = [
      { name: 'Lanches', description: 'Sanduíches e hambúrgueres' },
      { name: 'Bebidas', description: 'Refrigerantes, sucos e água' },
      { name: 'Sobremesas', description: 'Doces e sobremesas' },
      { name: 'Acompanhamentos', description: 'Batatas, saladas e outros' }
    ];

    console.log('📂 Criando categorias...');
    for (const category of categories) {
      const [existing] = await db.query('SELECT id FROM categories WHERE name = ?', [category.name]);
      
      if (existing.length === 0) {
        await db.query(
          'INSERT INTO categories (name, description) VALUES (?, ?)',
          [category.name, category.description]
        );
        console.log(`✅ Categoria criada: ${category.name}`);
      } else {
        console.log(`⏭️ Categoria já existe: ${category.name}`);
      }
    }

    // Buscar categorias criadas
    const [createdCategories] = await db.query('SELECT id, name FROM categories');

    // Criar grupos de opções de teste
    const optionGroups = [
      { name: 'Tamanho de Bebida', product_type: 'bebida', min_selections: 1, max_selections: 1, is_required: true },
      { name: 'Adicionais de Hambúrguer', product_type: 'lanche', min_selections: 0, max_selections: 5, is_required: false },
      { name: 'Molhos', product_type: 'lanche', min_selections: 0, max_selections: 3, is_required: false },
      { name: 'Tamanho de Batata', product_type: 'acompanhamento', min_selections: 1, max_selections: 1, is_required: true }
    ];

    console.log('📦 Criando grupos de opções...');
    for (const group of optionGroups) {
      const [existing] = await db.query(
        'SELECT id FROM option_groups WHERE name = ? AND establishment_id = ?', 
        [group.name, establishmentId]
      );
      
      if (existing.length === 0) {
        await db.query(
          'INSERT INTO option_groups (name, product_type, min_selections, max_selections, is_required, establishment_id) VALUES (?, ?, ?, ?, ?, ?)',
          [group.name, group.product_type, group.min_selections, group.max_selections, group.is_required, establishmentId]
        );
        console.log(`✅ Grupo criado: ${group.name}`);
      } else {
        console.log(`⏭️ Grupo já existe: ${group.name}`);
      }
    }

    // Buscar grupos criados
    const [createdGroups] = await db.query(
      'SELECT id, name FROM option_groups WHERE establishment_id = ?',
      [establishmentId]
    );

    // Criar opções de teste
    const options = [
      // Tamanhos de bebida
      { name: 'Pequeno (300ml)', additional_price: 0.00, group_name: 'Tamanho de Bebida' },
      { name: 'Médio (500ml)', additional_price: 2.00, group_name: 'Tamanho de Bebida' },
      { name: 'Grande (700ml)', additional_price: 4.00, group_name: 'Tamanho de Bebida' },
      
      // Adicionais de hambúrguer
      { name: 'Queijo Extra', additional_price: 3.00, group_name: 'Adicionais de Hambúrguer' },
      { name: 'Bacon', additional_price: 5.00, group_name: 'Adicionais de Hambúrguer' },
      { name: 'Ovo', additional_price: 2.50, group_name: 'Adicionais de Hambúrguer' },
      { name: 'Alface', additional_price: 1.00, group_name: 'Adicionais de Hambúrguer' },
      { name: 'Tomate', additional_price: 1.00, group_name: 'Adicionais de Hambúrguer' },
      
      // Molhos
      { name: 'Ketchup', additional_price: 0.00, group_name: 'Molhos' },
      { name: 'Maionese', additional_price: 0.00, group_name: 'Molhos' },
      { name: 'Mostarda', additional_price: 0.00, group_name: 'Molhos' },
      { name: 'Molho Especial', additional_price: 1.50, group_name: 'Molhos' },
      
      // Tamanhos de batata
      { name: 'Pequena', additional_price: 0.00, group_name: 'Tamanho de Batata' },
      { name: 'Média', additional_price: 3.00, group_name: 'Tamanho de Batata' },
      { name: 'Grande', additional_price: 6.00, group_name: 'Tamanho de Batata' }
    ];

    console.log('🍽️ Criando opções...');
    for (const option of options) {
      const group = createdGroups.find(g => g.name === option.group_name);
      if (!group) {
        console.log(`⚠️ Grupo não encontrado: ${option.group_name}`);
        continue;
      }

      const [existing] = await db.query(
        'SELECT id FROM options WHERE name = ? AND group_id = ?',
        [option.name, group.id]
      );
      
      if (existing.length === 0) {
        await db.query(
          'INSERT INTO options (name, additional_price, description, group_id, is_available) VALUES (?, ?, ?, ?, ?)',
          [option.name, option.additional_price, '', group.id, true]
        );
        console.log(`✅ Opção criada: ${option.name}`);
      } else {
        console.log(`⏭️ Opção já existe: ${option.name}`);
      }
    }

    // Criar produtos de teste
    const products = [
      {
        name: 'X-Burger',
        description: 'Hambúrguer com queijo, alface, tomate e molho especial',
        price: 15.90,
        category_name: 'Lanches'
      },
      {
        name: 'X-Bacon',
        description: 'Hambúrguer com queijo, bacon, alface, tomate e molho especial',
        price: 18.90,
        category_name: 'Lanches'
      },
      {
        name: 'Refrigerante',
        description: 'Refrigerante de sua preferência',
        price: 8.90,
        category_name: 'Bebidas'
      },
      {
        name: 'Batata Frita',
        description: 'Batatas fritas crocantes',
        price: 12.90,
        category_name: 'Acompanhamentos'
      },
      {
        name: 'Sorvete',
        description: 'Sorvete de creme com calda',
        price: 6.90,
        category_name: 'Sobremesas'
      }
    ];

    console.log('🍔 Criando produtos...');
    for (const product of products) {
      const category = createdCategories.find(c => c.name === product.category_name);
      if (!category) {
        console.log(`⚠️ Categoria não encontrada: ${product.category_name}`);
        continue;
      }

      const [existing] = await db.query(
        'SELECT id FROM products WHERE name = ? AND establishment_id = ?',
        [product.name, establishmentId]
      );
      
      if (existing.length === 0) {
        await db.query(
          'INSERT INTO products (name, description, price, category_id, establishment_id, is_available) VALUES (?, ?, ?, ?, ?, ?)',
          [product.name, product.description, product.price, category.id, establishmentId, true]
        );
        console.log(`✅ Produto criado: ${product.name}`);
      } else {
        console.log(`⏭️ Produto já existe: ${product.name}`);
      }
    }

    // SQL para criar a tabela de histórico de entregas
    /*
    CREATE TABLE delivery_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      establishment_id INT NOT NULL,
      establishment_name VARCHAR(255) NOT NULL,
      delivery_id INT NOT NULL,
      delivery_name VARCHAR(255) NOT NULL,
      order_id INT,
      customer_name VARCHAR(255),
      customer_phone VARCHAR(30),
      delivery_address TEXT,
      items TEXT,
      total_amount DECIMAL(10,2),
      delivery_fee DECIMAL(10,2),
      finished_at DATETIME,
      payment_method VARCHAR(20),
      order_notes TEXT
    );
    */

    console.log('🎉 População de dados de teste concluída!');
    console.log('\n📊 Resumo dos dados criados:');
    console.log(`- ${createdCategories.length} categorias`);
    console.log(`- ${createdGroups.length} grupos de opções`);
    console.log(`- ${options.length} opções`);
    console.log(`- ${products.length} produtos`);

  } catch (error) {
    console.error('❌ Erro ao popular dados de teste:', error);
  } finally {
    process.exit(0);
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  seedTestData();
}

module.exports = seedTestData; 