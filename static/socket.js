$(function () {
    const socket = io({
        transports: ['websocket', 'polling']
    });

    socket.on('connect', function() {
        console.log('Connected!');
        $('#console').html('&#x200B;'); // Zero-width space
    
        socket.on('new_message', function(message) {
            console.dir(message);
            $('#console').append(`${message}\n`);
        });

        socket.emit('start', {});
    });

    $('#runAgainButton').click(function() {
        $('#console').html('&#x200B;'); // Zero-width space
        socket.emit('start', {});
    });

    $('#createProductButton').click(function() {
        const payload = {
            category: String($('#productCategory').val() ?? ''),
            name: String($('#productName').val() ?? ''),
            quantity: Number($('#productQuantity').val()),
            price: Number($('#productPrice').val()),
            clearance: $('#productClearance').is(':checked')
        };

        socket.emit('create_item', payload);
    });
});
