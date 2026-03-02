import 'dotenv/config';
import { db, queryClient } from './connection.js';
import { users, foods } from './schema.js';

const defaultFoods: Array<{
  name: string;
  emoji: string;
  category: typeof foods.$inferInsert['category'];
  servingLabel: string;
  servingGrams: string;
  calories: string;
  protein: string;
  fat: string;
  carbs: string;
}> = [
  // Proteins
  { name: 'Chicken Breast', emoji: '🍗', category: 'proteins', servingLabel: 'per 100g', servingGrams: '100', calories: '165', protein: '31', fat: '3.6', carbs: '0' },
  { name: 'Eggs', emoji: '🥚', category: 'proteins', servingLabel: 'per egg (50g)', servingGrams: '50', calories: '72', protein: '6.3', fat: '4.8', carbs: '0.4' },
  { name: 'Ground Beef (90/10)', emoji: '🥩', category: 'proteins', servingLabel: 'per 100g', servingGrams: '100', calories: '176', protein: '20', fat: '10', carbs: '0' },
  { name: 'Salmon', emoji: '🐟', category: 'proteins', servingLabel: 'per 100g', servingGrams: '100', calories: '208', protein: '20', fat: '13', carbs: '0' },
  { name: 'Greek Yogurt', emoji: '🥛', category: 'dairy', servingLabel: 'per 170g', servingGrams: '170', calories: '100', protein: '17', fat: '0.7', carbs: '6' },

  // Grains
  { name: 'White Rice (cooked)', emoji: '🍚', category: 'grains', servingLabel: 'per cup (186g)', servingGrams: '186', calories: '242', protein: '4.4', fat: '0.4', carbs: '53' },
  { name: 'Whole Wheat Bread', emoji: '🍞', category: 'grains', servingLabel: 'per slice (28g)', servingGrams: '28', calories: '69', protein: '3.6', fat: '1.1', carbs: '12' },
  { name: 'Oatmeal', emoji: '🥣', category: 'grains', servingLabel: 'per cup cooked (234g)', servingGrams: '234', calories: '154', protein: '5.4', fat: '2.6', carbs: '27' },
  { name: 'Pasta (cooked)', emoji: '🍝', category: 'grains', servingLabel: 'per cup (140g)', servingGrams: '140', calories: '220', protein: '8.1', fat: '1.3', carbs: '43' },

  // Vegetables
  { name: 'Mixed Salad', emoji: '🥗', category: 'vegetables', servingLabel: 'per cup (85g)', servingGrams: '85', calories: '15', protein: '1.3', fat: '0.2', carbs: '2.4' },
  { name: 'Broccoli', emoji: '🥦', category: 'vegetables', servingLabel: 'per cup (91g)', servingGrams: '91', calories: '31', protein: '2.6', fat: '0.3', carbs: '6' },
  { name: 'Sweet Potato', emoji: '🍠', category: 'vegetables', servingLabel: 'per medium (114g)', servingGrams: '114', calories: '103', protein: '2.3', fat: '0.1', carbs: '24' },

  // Fruits
  { name: 'Apple', emoji: '🍎', category: 'fruits', servingLabel: 'per medium (182g)', servingGrams: '182', calories: '95', protein: '0.5', fat: '0.3', carbs: '25' },
  { name: 'Banana', emoji: '🍌', category: 'fruits', servingLabel: 'per medium (118g)', servingGrams: '118', calories: '105', protein: '1.3', fat: '0.4', carbs: '27' },

  // Snacks
  { name: 'Almonds', emoji: '🥜', category: 'snacks', servingLabel: 'per oz (28g)', servingGrams: '28', calories: '164', protein: '6', fat: '14', carbs: '6' },
  { name: 'Protein Bar', emoji: '🍫', category: 'snacks', servingLabel: 'per bar (60g)', servingGrams: '60', calories: '210', protein: '20', fat: '7', carbs: '22' },

  // Dairy
  { name: 'Milk (2%)', emoji: '🥛', category: 'dairy', servingLabel: 'per cup (244g)', servingGrams: '244', calories: '122', protein: '8.1', fat: '4.8', carbs: '12' },
  { name: 'Cheddar Cheese', emoji: '🧀', category: 'dairy', servingLabel: 'per oz (28g)', servingGrams: '28', calories: '113', protein: '7', fat: '9.3', carbs: '0.4' },

  // Drinks
  { name: 'Black Coffee', emoji: '☕', category: 'drinks', servingLabel: 'per cup (237ml)', servingGrams: '237', calories: '2', protein: '0.3', fat: '0', carbs: '0' },
  { name: 'Orange Juice', emoji: '🍊', category: 'drinks', servingLabel: 'per cup (248ml)', servingGrams: '248', calories: '112', protein: '1.7', fat: '0.5', carbs: '26' },

  // Other
  { name: 'Olive Oil', emoji: '🫒', category: 'other', servingLabel: 'per tbsp (14g)', servingGrams: '14', calories: '119', protein: '0', fat: '13.5', carbs: '0' },
  { name: 'Honey', emoji: '🍯', category: 'other', servingLabel: 'per tbsp (21g)', servingGrams: '21', calories: '64', protein: '0.1', fat: '0', carbs: '17' },
];

async function seed() {
  console.log('🌱 Seeding database...');

  // Create default user
  const [user] = await db
    .insert(users)
    .values({
      age: 30,
      sex: 'male',
      heightInches: '70',
      currentWeight: '180',
      objective: 'maintain',
      activityLevel: '1.25',
      calorieTarget: 2200,
      proteinTarget: 180,
      fatTarget: 70,
      carbTarget: 240,
    })
    .returning();

  console.log(`✅ Created user: ${user!.id}`);

  // Seed default foods
  for (const food of defaultFoods) {
    await db.insert(foods).values({
      userId: user!.id,
      ...food,
      source: 'manual',
    });
  }

  console.log(`✅ Seeded ${defaultFoods.length} foods`);
  console.log('🎉 Seed complete!');

  await queryClient.end();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
