// Comprehensive English idioms dictionary
// Extracted from commonly used English idioms list
// Format: 'idiom phrase': 'literal meaning'

const IDIOMS_DICTIONARY = {
  // A
  'a hot potato': 'a disputed issue that many people are talking about',
  'a penny for your thoughts': 'asking what someone is thinking',
  'actions speak louder than words': 'intentions are judged by actions not words',
  'add insult to injury': 'make a bad situation worse',
  'an arm and a leg': 'very expensive',
  'as right as rain': 'perfect or in good health',
  'at the drop of a hat': 'without any hesitation',

  // B
  'back to the drawing board': 'start over after a failure',
  'ball is in your court': 'it is your decision',
  'barking up the wrong tree': 'looking in the wrong place',
  'be glad to see the back of': 'be happy when a person leaves',
  'beat around the bush': 'avoiding the main topic',
  'best of both worlds': 'all the advantages',
  'best thing since sliced bread': 'a good invention or innovation',
  'bite off more than you can chew': 'take on a task that is too big',
  'blessing in disguise': 'something good that is not recognized at first',
  'break a leg': 'good luck',
  'burn the midnight oil': 'work late into the night',
  'by the skin of your teeth': 'just barely',

  // C
  'can\'t judge a book by its cover': 'cannot judge by appearance',
  'caught between two stools': 'difficult to choose between two alternatives',
  'come rain or shine': 'no matter what happens',
  'costs an arm and a leg': 'very expensive',
  'cross that bridge when you come to it': 'deal with a problem when it happens',
  'cry over spilt milk': 'complain about a loss from the past',
  'curiosity killed the cat': 'being inquisitive can lead to trouble',
  'cut corners': 'done badly to save money',
  'cut the mustard': 'succeed or meet expectations',

  // D
  'devil\'s advocate': 'present a counter argument',
  'don\'t count your chickens before the eggs have hatched': 'do not make plans for something that might not happen',
  'don\'t give up the day job': 'you are not very good at something',
  'don\'t put all your eggs in one basket': 'do not put all resources in one possibility',
  'drastic times call for drastic measures': 'desperate situations need drastic actions',

  // E
  'elvis has left the building': 'the show has come to an end',
  'every cloud has a silver lining': 'be optimistic even in difficult times',

  // F
  'far cry from': 'very different from',
  'feel a bit under the weather': 'feeling slightly ill',

  // G
  'give the benefit of the doubt': 'believe someone without proof',
  'go back to the drawing board': 'start over',
  'go down in flames': 'fail spectacularly',
  'get out of hand': 'become uncontrollable',
  'get your act together': 'organize yourself',
  'give someone the cold shoulder': 'ignore someone',

  // H
  'hear it on the grapevine': 'hear rumors',
  'hit the nail on the head': 'do or say something exactly right',
  'hit the sack': 'go to bed',
  'hit the sheets': 'go to bed',
  'hit the hay': 'go to bed',
  'hang in there': 'persevere',

  // I
  'in the heat of the moment': 'overwhelmed by what is happening',
  'it takes two to tango': 'actions need more than one person',

  // J
  'jump on the bandwagon': 'join a popular trend',

  // K
  'keep something at bay': 'keep something away',
  'kill two birds with one stone': 'accomplish two things at the same time',

  // L
  'last straw': 'the final problem in a series',
  'let sleeping dogs lie': 'do not disturb a situation',
  'let the cat out of the bag': 'share information that was concealed',
  'let someone off the hook': 'not punish someone',

  // M
  'make a long story short': 'come to the point',
  'method to my madness': 'there is structure to my approach',
  'miss the boat': 'miss your chance',

  // N
  'not a spark of decency': 'no manners',
  'not playing with a full deck': 'lacks intelligence',
  'no pain, no gain': 'hard work brings rewards',

  // O
  'off one\'s rocker': 'crazy or demented',
  'on the ball': 'understands the situation well',
  'once in a blue moon': 'happens very rarely',

  // P
  'picture paints a thousand words': 'visual presentation is more descriptive',
  'piece of cake': 'easy or simple task',
  'pull someone\'s leg': 'joke with someone or tease them',
  'pull yourself together': 'calm down',
  'put wool over other people\'s eyes': 'deceive someone',

  // S
  'sat on the fence': 'not make a decision',
  'see eye to eye': 'agree on something',
  'sit on the fence': 'not make a decision',
  'speak of the devil': 'the person being talked about arrives',
  'steal someone\'s thunder': 'take credit for what someone else did',
  'so far so good': 'everything is okay',
  'spill the beans': 'reveal a secret',

  // T
  'take with a grain of salt': 'do not take too seriously',
  'take with a pinch of salt': 'do not take too seriously',
  'taste of your own medicine': 'something you did to others happens to you',
  'through thick and thin': 'in good times and bad times',
  'to hear something straight from the horse\'s mouth': 'hear from the authoritative source',
  'the ball is in your court': 'it is your decision',
  'the best of both worlds': 'ideal situation',
  'the last straw': 'the final problem',
  'that ship has sailed': 'that opportunity is gone',
  'throw in the towel': 'give up',
  'under the weather': 'feeling sick',

  // W
  'whole nine yards': 'everything',
  'wouldn\'t be caught dead': 'would never like to do something',

  // Y
  'you can say that again': 'I agree completely',
  'your guess is as good as mine': 'I do not know the answer'
};

// Export for use in content script
if (typeof window !== 'undefined') {
  window.IDIOMS_DICTIONARY = IDIOMS_DICTIONARY;
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IDIOMS_DICTIONARY;
}
