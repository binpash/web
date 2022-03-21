#include <string.h>
#include <malloc.h>
#include <assert.h>

#include "Stack.h"


#define TRUE  1
#define FALSE 0


struct node {
    char c;
    struct node* next;
};


struct stack {
    int size;
    struct node* head;
};


Stack newStack (void) {
    Stack myStack = malloc (sizeof (struct stack));
    assert (myStack != NULL);

    myStack->size = 0;
    myStack->head = NULL;

    return myStack;
}



int isStackEmpty (Stack myStack) {
    assert (myStack != NULL);

    return (myStack->size == 0);
}


void pushStack (Stack myStack, char newChar) {
    assert (myStack != NULL);

    myStack->size ++;

    struct node* myNode = malloc (sizeof (struct node));
    assert (myNode != NULL);

    myNode->c = newChar;
    myNode->next = myStack->head;

    myStack->head = myNode;
}


char popStack (Stack myStack) {
    assert (myStack != NULL);

    myStack->size --;
    assert (myStack->head != NULL);

    struct node* oldHead = myStack->head;

    char myChar = myStack->head->c;
    myStack->head = myStack->head->next;

    free (oldHead);

    return myChar;
}



char topStack (Stack myStack) {
    assert (myStack != NULL);

    assert (myStack->head != NULL);

    return (myStack->head->c);
}


char secondTopStack (Stack myStack) {
    assert (myStack != NULL);

    assert (myStack->head != NULL);
    assert (myStack->head->next != NULL);

    return (myStack->head->next->c);
}


unsigned int getStackSize (Stack myStack) {
    assert (myStack != NULL);

    return (myStack->size);
}


void destroyStack (Stack myStack) {
    assert (myStack != NULL);

    while (! isStackEmpty (myStack)) {
        popStack (myStack);
    }

    free (myStack);
}


char* serializeStack (Stack myStack) {
    assert (myStack != NULL);

    char* str = malloc (myStack->size + 1);
    assert (str != NULL);

    int i = 0;
    struct node* cur = myStack->head;
    while (cur != NULL) {
        str [i] = cur->c;

        i ++;
        cur = cur->next;
    }
    str [i] = '\0';

    return str;
}


int existsInStack (Stack myStack, char key) {
    assert (myStack != NULL);

    struct node* head = myStack->head;
    while (head != NULL) {
        if (head->c == key) {
            return TRUE;
        }

        head = head->next;
    }

    return FALSE;
}



Stack explode (char* str) {
    assert (str != NULL);

    Stack list = newStack ();

    int len = strlen (str);
    for (int i = len - 1; i >= 0; i--) {
//    for (int i = 0; i < len; i++) {
        pushStack (list, str [i]);
    }

    return (list);
}


char* implode (Stack myList) {
    assert (myList != NULL);

    char* str = malloc (getStackSize (myList) + 1);
    assert (str != NULL);

    int i = 0;
    while (getStackSize (myList) > 0) {
        str [i] = popStack (myList);

        i ++;
    }

    str [i] = '\0';

    destroyStack (myList);

    return (str);
}



// Returns the first half of the list, divided by the separator (which stays in the original list).
Stack split_at (Stack myStack, char separator) {
    assert (myStack != NULL);

    Stack leftStack = newStack ();

    while (getStackSize (myStack) > 0) {
        if (topStack (myStack) == separator) {
            break; // Ugh
        }

        pushStack (leftStack, popStack (myStack));
    }

    Stack revLeftStack = newStack ();
    while (getStackSize (leftStack) > 0) {
        pushStack (revLeftStack, popStack (leftStack));
    }

    return (revLeftStack);
}


/*
Stack split_at (Stack oldStack, char separator) {
    assert (oldStack != NULL);

    Stack myStack = newStack ();
    assert (myStack != NULL);

    for (int i = 0; i < oldStack->usedSize; i++) {
        if (oldStack->items [i] == separator) {
        
        }
    }

    assert (! "Separator not found");
    return NULL;
}
*/
