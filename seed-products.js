const { executeQuery } = require('./config/database');

const seedProducts = async () => {
  try {
    console.log('🌱 Iniciando inserção de produtos de teste...');
    
    const products = [
      // Lanches (categoria_id = 1)
      {
        name: 'X-Burger',
        description: 'Hambúrguer artesanal com queijo, alface, tomate e maionese especial',
        price: 18.90,
        category_id: 1,
        establishment_id: 1,
        image_url: 'https://source.unsplash.com/400x300/?burger'
      },
      {
        name: 'X-Bacon',
        description: 'Hambúrguer com bacon crocante, queijo, alface e tomate',
        price: 22.50,
        category_id: 1,
        establishment_id: 1,
        image_url: 'https://source.unsplash.com/400x300/?bacon-burger'
      },
      {
        name: 'X-Frango',
        description: 'Hambúrguer de frango grelhado com queijo e salada',
        price: 16.90,
        category_id: 1,
        establishment_id: 1,
        image_url: 'https://source.unsplash.com/400x300/?chicken-burger'
      },
      {
        name: 'X-Calabresa',
        description: 'Hambúrguer com calabresa, queijo e cebola caramelizada',
        price: 20.90,
        category_id: 1,
        establishment_id: 1,
        image_url: 'https://source.unsplash.com/400x300/?sausage-burger'
      },
      
      // Pizzas (categoria_id = 2)
      {
        name: 'Pizza Margherita',
        description: 'Molho de tomate, mussarela, manjericão fresco',
        price: 28.90,
        category_id: 2,
        establishment_id: 1,
        image_url: 'https://source.unsplash.com/400x300/?pizza-margherita'
      },
      {
        name: 'Pizza Pepperoni',
        description: 'Molho de tomate, mussarela e pepperoni',
        price: 32.90,
        category_id: 2,
        establishment_id: 1,
        image_url: 'https://source.unsplash.com/400x300/?pizza-pepperoni'
      },
      {
        name: 'Pizza 4 Queijos',
        description: 'Molho de tomate, mussarela, parmesão, provolone e gorgonzola',
        price: 35.90,
        category_id: 2,
        establishment_id: 1,
        image_url: 'https://source.unsplash.com/400x300/?pizza-cheese'
      },
      
      // Bebidas (categoria_id = 3)
      {
        name: 'Coca-Cola 350ml',
        description: 'Refrigerante Coca-Cola lata',
        price: 5.90,
        category_id: 3,
        establishment_id: 1,
        image_url: 'https://source.unsplash.com/400x300/?coca-cola'
      },
      {
        name: 'Suco de Laranja Natural',
        description: 'Suco de laranja natural 300ml',
        price: 8.90,
        category_id: 3,
        establishment_id: 1,
        image_url: 'https://source.unsplash.com/400x300/?orange-juice'
      },
      {
        name: 'Água Mineral 500ml',
        description: 'Água mineral sem gás',
        price: 3.50,
        category_id: 3,
        establishment_id: 1,
        image_url: 'https://source.unsplash.com/400x300/?water-bottle'
      },
      {
        name: 'Cerveja Heineken 350ml',
        description: 'Cerveja Heineken lata',
        price: 6.90,
        category_id: 3,
        establishment_id: 1,
        image_url: 'https://source.unsplash.com/400x300/?beer'
      },
      
      // Sobremesas (categoria_id = 4)
      {
        name: 'Sorvete de Chocolate',
        description: 'Sorvete cremoso de chocolate com calda',
        price: 12.90,
        category_id: 4,
        establishment_id: 1,
        image_url: 'https://source.unsplash.com/400x300/?chocolate-ice-cream'
      },
      {
        name: 'Pudim de Leite',
        description: 'Pudim de leite condensado com calda de caramelo',
        price: 10.90,
        category_id: 4,
        establishment_id: 1,
        image_url: 'https://source.unsplash.com/400x300/?pudding'
      },
      {
        name: 'Mousse de Maracujá',
        description: 'Mousse cremoso de maracujá',
        price: 9.90,
        category_id: 4,
        establishment_id: 1,
        image_url: 'https://source.unsplash.com/400x300/?passion-fruit-mousse'
      },
      
      // Combos (categoria_id = 5)
      {
        name: 'Combo X-Burger + Batata + Refri',
        description: 'X-Burger, batata frita média e refrigerante 350ml',
        price: 25.90,
        category_id: 5,
        establishment_id: 1,
        image_url: 'https://source.unsplash.com/400x300/?combo-burger'
      },
      {
        name: 'Combo Pizza + Refri',
        description: 'Pizza média + refrigerante 350ml',
        price: 35.90,
        category_id: 5,
        establishment_id: 1,
        image_url: 'https://source.unsplash.com/400x300/?pizza-combo'
      },
      {
        name: 'Combo Lanche + Suco',
        description: 'Qualquer lanche + suco natural 300ml',
        price: 22.90,
        category_id: 5,
        establishment_id: 1,
        image_url: 'https://source.unsplash.com/400x300/?sandwich-juice-combo'
      }
    ];

    // Verificar se já existem produtos
    const existingProducts = await executeQuery('SELECT COUNT(*) as count FROM products');
    
    if (existingProducts[0].count > 0) {
      console.log('⚠️  Já existem produtos no banco de dados. Pulando inserção.');
      return;
    }

    // Inserir produtos
    for (const product of products) {
      const query = `
        INSERT INTO products (name, description, price, category_id, establishment_id, image_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      await executeQuery(query, [
        product.name,
        product.description,
        product.price,
        product.category_id,
        product.establishment_id,
        product.image_url
      ]);
      
      console.log(`✅ Produto inserido: ${product.name}`);
    }
    
    console.log('🎉 Todos os produtos de teste foram inseridos com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao inserir produtos:', error);
  } finally {
    process.exit(0);
  }
};

// Executar o script
seedProducts(); 